import {
	expect,
	test,
	type APIRequestContext,
	type Page,
} from "@playwright/test";

// WhatsApp interactive-button landing pages.
//
// After a booking completes, the backend sends a WhatsApp with native URL
// buttons. Each button must resolve to a working preact page for restaurant 1:
//
//   CONDICIONES          -> /booking-policies
//   Cancelar Reserva     -> /cancel?id=<bookingId>
//   Confirmar asistencia -> /confirm?id=<bookingId>   (reminder flow)
//   Reservar Arroz       -> /update-rice?id=<bookingId> (reminder flow)
//
// These tests create bookings through the API (fast, deterministic) and
// exercise every landing page end-to-end against the live dev backend.
// Each created booking is cancelled in afterAll.

const RICE_TYPE = "Arroz a banda.";
const created: number[] = [];

// Live backend rate-limits booking creation; run serially.
test.describe.configure({ mode: "serial" });

function isoDaysAhead(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function postWithRetry(
	request: APIRequestContext,
	url: string,
	opts: Parameters<APIRequestContext["post"]>[1],
) {
	for (let attempt = 0; attempt < 5; attempt++) {
		const res = await request.post(url, opts);
		if (res.status() !== 429) return res;
		await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
	}
	return request.post(url, opts);
}

// First open future date (skip Mon/Tue/Wed which are closed by default) with a
// free morning hour slot.
async function pickOpenFutureDate(
	request: APIRequestContext,
): Promise<{ iso: string; time: string }> {
	for (let ahead = 5; ahead <= 40; ahead++) {
		const iso = isoDaysAhead(ahead);
		const dow = new Date(`${iso}T00:00:00`).getDay();
		if (dow === 1 || dow === 2 || dow === 3) continue;
		const ctxRes = await request.get(
			`/api/reservations/day-context?date=${iso}`,
		);
		if (!ctxRes.ok()) continue;
		const ctx = await ctxRes.json();
		const hours: string[] = Array.isArray(ctx.morningHours)
			? ctx.morningHours
			: [];
		if (!ctx.activeFloors?.length || hours.length === 0) continue;
		const hourRes = await request.get(
			`/api/reservations/hour-data?date=${iso}`,
		);
		if (!hourRes.ok()) continue;
		const hourData = await hourRes.json();
		const slot = hours.find((h) => {
			const s = hourData.hourData?.[h];
			return (
				s &&
				!s.isClosed &&
				s.status !== "closed" &&
				(typeof s.capacity !== "number" || s.capacity >= 2)
			);
		});
		if (slot) return { iso, time: slot };
	}
	throw new Error("No open future date found in the next 40 days");
}

async function apiCreateBooking(
	request: APIRequestContext,
	opts: { date: string; time: string; rice?: boolean },
): Promise<number> {
	const form: Record<string, string> = {
		website_url: "",
		form_load_time: String(Math.floor(Date.now() / 1000) - 30),
		reservation_date: opts.date,
		party_size: "2",
		reservation_time: opts.time,
		preferred_floor_number: "0",
		customer_name: "E2E WhatsApp Links",
		contact_email: "e2e-whatsapp@example.com",
		country_code: "+34",
		contact_phone: "600111333",
		adults: "2",
		children: "0",
		menu_de_grupo_selected: "0",
		menu_de_grupo_id: "",
		principales_enabled: "0",
		principales_json: "[]",
		toggleArroz: opts.rice ? "true" : "false",
		high_chairs: "0",
		baby_strollers: "0",
	};
	if (opts.rice) {
		form.arroz_type = RICE_TYPE;
		form.arroz_servings = "2";
	}
	// Random X-Forwarded-For gives each booking its own rate-limit bucket.
	const res = await postWithRetry(request, "/api/bookings/front", {
		multipart: form,
		headers: {
			"X-Forwarded-For": `203.0.113.${100 + Math.floor(Math.random() * 100)}`,
		},
	});
	expect(
		res.ok(),
		`create booking failed: ${res.status()} ${await res.text()}`,
	).toBeTruthy();
	const data = await res.json();
	expect(
		data.success,
		`create booking not success: ${JSON.stringify(data)}`,
	).toBeTruthy();
	expect(typeof data.booking_id).toBe("number");
	created.push(data.booking_id);
	return data.booking_id;
}

// Boot splash overlays the app until first paint + media settle; cold loads can
// outlast the default expect timeout, so wait for it to detach first.
async function awaitBootDone(page: Page): Promise<void> {
	await page
		.locator("#vc-boot")
		.waitFor({ state: "detached", timeout: 30_000 })
		.catch(() => {});
}

test.afterAll(async ({ playwright }, testInfo) => {
	const base =
		process.env.PLAYWRIGHT_BASE_URL ||
		testInfo.project.use.baseURL ||
		"http://127.0.0.1:4173";
	const request = await playwright.request.newContext({ baseURL: base });
	for (const id of created) {
		await request
			.post("/api/public/booking/cancel", { data: { id, cancelledBy: "e2e" } })
			.catch(() => undefined);
	}
	await request.dispose();
});

test("CONDICIONES -> /booking-policies renders policies", async ({ page }) => {
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));

	const response = await page.goto("/booking-policies", {
		waitUntil: "domcontentloaded",
	});
	expect(response?.status(), "booking-policies HTTP status").toBe(200);
	await expect(page.locator(".legalPage")).toBeVisible();
	// Seeded legal_pages row for restaurant 1 starts with the no-show policy.
	await expect(page.locator(".wrapperavisolegal")).toContainText(
		"Política de No Asistencia",
	);
	// Vite HMR websocket noise from tunneled dev hosts is environmental, not an app error.
	const unrelatedErrors = pageErrors.filter(
		(error) => !error.includes("WebSocket closed without opened."),
	);
	expect(unrelatedErrors).toEqual([]);
});

test("Cancelar Reserva -> /cancel?id= renders and cancels", async ({
	page,
	request,
}) => {
	const { iso, time } = await pickOpenFutureDate(request);
	const id = await apiCreateBooking(request, { date: iso, time });

	await page.goto(`/cancel?id=${id}`);
	await awaitBootDone(page);
	const card = page.locator('[data-ui="cancel-reservation"]');
	await expect(card).toHaveAttribute("data-state", "ready");
	await expect(card.locator('[data-slot="customer-name"]')).toContainText(
		"E2E WhatsApp Links",
	);

	const [res] = await Promise.all([
		page.waitForResponse(
			(r) =>
				r.url().includes("/api/public/booking/cancel") &&
				r.request().method() === "POST",
		),
		card.locator('[data-slot="cancel-btn"]').click(),
	]);
	expect((await res.json()).success).toBeTruthy();
	await expect(page.locator('[data-ui="cancel-reservation"]')).toHaveAttribute(
		"data-state",
		"success",
	);
});

test("Confirmar asistencia -> /confirm?id= renders and confirms", async ({
	page,
	request,
}) => {
	const { iso, time } = await pickOpenFutureDate(request);
	const id = await apiCreateBooking(request, { date: iso, time });

	await page.goto(`/confirm?id=${id}`);
	await awaitBootDone(page);
	const card = page.locator('[data-ui="confirm-reservation"]');
	await expect(card).toHaveAttribute("data-state", "ready");
	await expect(card.locator('[data-slot="customer-name"]')).toContainText(
		"E2E WhatsApp Links",
	);

	const [res] = await Promise.all([
		page.waitForResponse(
			(r) =>
				r.url().includes("/api/public/booking/confirm") &&
				r.request().method() === "POST",
		),
		card.locator('[data-slot="confirm-btn"]').click(),
	]);
	expect((await res.json()).success).toBeTruthy();
	await expect(page.locator('[data-ui="confirm-reservation"]')).toHaveAttribute(
		"data-state",
		"success",
	);
});

test("Reservar Arroz -> /update-rice?id= renders and saves rice", async ({
	page,
	request,
}) => {
	const { iso, time } = await pickOpenFutureDate(request);
	const id = await apiCreateBooking(request, { date: iso, time }); // no rice

	await page.goto(`/update-rice?id=${id}`);
	await awaitBootDone(page);
	const card = page.locator('[data-ui="book-rice"]');
	await expect(card).toHaveAttribute("data-state", "ready");
	await expect(card.locator('[data-slot="customer-name"]')).toContainText(
		"E2E WhatsApp Links",
	);

	// Select a rice type via the Selector component.
	await card.locator('[data-slot="trigger"]').click();
	const firstOption = card.locator('[data-slot="option"]').first();
	await expect(firstOption).toBeVisible();
	await firstOption.click();

	const submit = card.locator('[data-slot="submit-btn"]');
	await expect(submit).toBeEnabled();

	const [res] = await Promise.all([
		page.waitForResponse(
			(r) =>
				r.url().includes("/api/public/booking/rice") &&
				r.request().method() === "POST",
		),
		submit.click(),
	]);
	expect((await res.json()).success).toBeTruthy();
	await expect(page.locator('[data-ui="book-rice"]')).toHaveAttribute(
		"data-state",
		"success",
	);
});
