import { Route, Switch } from 'wouter-preact'
import { BackofficeLayout } from './routes/backoffice/BackofficeLayout.tsx'
import { BackofficeHome } from './routes/backoffice/BackofficeHome.tsx'
import { ClientLayout } from './routes/client/ClientLayout.tsx'
import { Bebidas } from './routes/client/Bebidas.tsx'
import { Cafes } from './routes/client/Cafes.tsx'
import { FoodPageGuard } from './routes/client/FoodPageGuard.tsx'
import { Contacto } from './routes/client/Contacto.tsx'
import { Eventos } from './routes/client/Eventos.tsx'
import { Home } from './routes/client/Home.tsx'
import { LegacyMenuRedirect } from './routes/client/LegacyMenuRedirect.tsx'
import { MenuCatalogRoute } from './routes/client/MenuCatalogRoute.tsx'
import { MenusDeGrupos } from './routes/client/MenusDeGrupos.tsx'
import { Postres } from './routes/client/Postres.tsx'
import { Placeholder } from './routes/client/Placeholder.tsx'
import { Reservas } from './routes/client/Reservas.tsx'
import { AvisoLegal } from './routes/client/AvisoLegal.tsx'
import { BookingPolicies } from './routes/client/BookingPolicies.tsx'
import { ConfirmBooking } from './routes/client/ConfirmBooking.tsx'
import { CancelBooking } from './routes/client/CancelBooking.tsx'
import { UpdateRice } from './routes/client/UpdateRice.tsx'
import { ProteccionDatos } from './routes/client/ProteccionDatos.tsx'
import { Vinos } from './routes/client/Vinos.tsx'

function ClientApp() {
  return (
    <ClientLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/contacto" component={Contacto} />
        <Route path="/eventos" component={Eventos} />

        <Route path="/menu/:menuId/:menuSlug" component={MenuCatalogRoute} />
        <Route path="/menu/:menuId" component={MenuCatalogRoute} />
        <Route path="/menufindesemana" component={() => <LegacyMenuRedirect target="finde" />} />
        <Route path="/menudeldia" component={() => <LegacyMenuRedirect target="dia" />} />
        <Route path="/menusdegrupos" component={MenusDeGrupos} />
        <Route path="/postres">
          <FoodPageGuard kind="postres">
            <Postres />
          </FoodPageGuard>
        </Route>
        <Route path="/vinos">
          <FoodPageGuard kind="vinos">
            <Vinos />
          </FoodPageGuard>
        </Route>
        <Route path="/cafes">
          <FoodPageGuard kind="cafes">
            <Cafes />
          </FoodPageGuard>
        </Route>
        <Route path="/bebidas">
          <FoodPageGuard kind="bebidas">
            <Bebidas />
          </FoodPageGuard>
        </Route>
        <Route path="/reservas" component={Reservas} />
        <Route path="/reservas.php" component={Reservas} />
        <Route path="/avisolegal" component={AvisoLegal} />
        <Route path="/avisolegal.html" component={AvisoLegal} />
        <Route path="/booking-policies" component={BookingPolicies} />
        <Route path="/booking_policies.php" component={BookingPolicies} />
        <Route path="/confirm" component={ConfirmBooking} />
        <Route path="/cancel" component={CancelBooking} />
        <Route path="/update-rice" component={UpdateRice} />
        <Route path="/protecciondatos" component={ProteccionDatos} />
        <Route path="/protecciondatos.html" component={ProteccionDatos} />
        <Route path="/menusanvalentin" component={() => <Placeholder titleKey="nav.valentine" />} />
        <Route path="/regala" component={() => <Placeholder titleKey="nav.gift" />} />

        <Route component={() => <Placeholder title="404" />} />
      </Switch>
    </ClientLayout>
  )
}

function BackofficeApp() {
  return (
    <BackofficeLayout>
      <Switch>
        <Route path="/backoffice" component={BackofficeHome} />
        <Route component={() => <Placeholder title="Backoffice" />} />
      </Switch>
    </BackofficeLayout>
  )
}

export function App() {
  return (
    <Switch>
      <Route path="/backoffice/:rest*" component={BackofficeApp} />
      <Route component={ClientApp} />
    </Switch>
  )
}
