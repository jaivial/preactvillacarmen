import type { EditorialContent } from '../components/EditorialLanding'
import type { Lang } from './i18n'

export const resourceContent: Record<string, Record<Lang, EditorialContent>> = {
  '/guia-arroces-valencianos': {
    es: {
      kicker: 'Guía práctica de cocina valenciana',
      title: 'Guía de arroces valencianos: secos, melosos y paella',
      intro: 'Una guía para reconocer distintas texturas del arroz, preparar una comida de grupo y elegir con información. Incluye una checklist reutilizable y enlaces a la oferta actual de Villa Carmen.',
      image: 'https://villacarmenmedia.b-cdn.net/1/pictures/menupreviewpictures/1/preview-1787247695442.webp',
      imageAlt: 'Arroz en paellera preparado en Alquería Villa Carmen', imageWidth: 1024, imageHeight: 1024,
      imageCaption: 'Fotografía del archivo propio de Villa Carmen, servida desde su CDN. Autor no identificado en el archivo; no es una imagen de stock.',
      sections: [
        { heading: 'Seco o meloso: empieza por la textura', body: 'En un arroz seco los granos quedan sueltos y el líquido se ha reducido; en uno meloso se aprecia caldo y una textura más cremosa. No son categorías de calidad: son formas distintas de preparar y servir. Pregunta por la propuesta disponible y por cómo se sirve antes de elegir.' },
        { heading: 'Qué tener en cuenta al pedir paella valenciana', body: 'La paella valenciana es una receta concreta, no un nombre genérico para cualquier arroz. La disponibilidad, los ingredientes y la necesidad de encargo deben confirmarse en la carta o el menú vigente. Si tienes alergias o necesitas una adaptación, consúltalo antes de reservar.', items: ['Revisa si la preparación requiere encargo.', 'Confirma para cuántas personas se ofrece y si se pide por mesa completa.', 'Consulta ingredientes, suplementos y alérgenos con el equipo.'] },
        { heading: 'Checklist para tu comida de arroz', checklist: true, body: 'Guarda esta lista para comparar opciones sin basarte solo en una fotografía.', items: ['Fecha, horario y número de comensales.', 'Textura y plato que queréis compartir.', 'Mínimo de personas, precio, bebidas y suplementos publicados.', 'Alergias, intolerancias y otras necesidades comunicadas.', 'Disponibilidad y condiciones confirmadas por el restaurante.'] },
        { heading: 'Cómo usamos esta guía en Villa Carmen', body: 'Publicamos los platos y condiciones del Menú Arrocero activo en nuestra página de arroces. Esta guía es contenido editorial permanente; la carta y su disponibilidad pueden cambiar, por lo que la ficha del menú y la confirmación del equipo prevalecen.' },
      ],
      faq: [
        { question: '¿Paella y arroz valenciano significan lo mismo?', answer: 'No necesariamente. La paella valenciana es una preparación concreta; existen otros arroces secos y melosos con ingredientes y formas de servicio distintos.' },
        { question: '¿Puedo usar esta lista para un grupo?', answer: 'Sí. Anota el número de asistentes, las necesidades alimentarias y el menú que os interesa. Después confirma las condiciones concretas con el restaurante.' },
        { question: '¿Los platos descritos están siempre disponibles?', answer: 'No. Esta guía explica conceptos; la oferta actual está en los menús publicados y debe confirmarse antes de reservar.' },
      ],
    },
    en: {
      kicker: 'A practical guide to Valencian cooking',
      title: 'A guide to Valencian rice: dry, creamy and paella',
      intro: 'A practical guide to rice textures, group dining and making an informed choice. Save the reusable checklist and follow the links to Villa Carmen’s current offering.',
      image: 'https://villacarmenmedia.b-cdn.net/1/pictures/menupreviewpictures/1/preview-1787247695442.webp',
      imageAlt: 'Rice in a paella pan prepared at Alqueria Villa Carmen', imageWidth: 1024, imageHeight: 1024,
      imageCaption: 'Photograph from Villa Carmen’s own media archive, served from its CDN. No author is identified in the file; this is not a stock image.',
      sections: [
        { heading: 'Dry or creamy: start with texture', body: 'In a dry rice dish the grains are separate and the liquid has reduced; a creamy, brothy rice retains more liquid. Neither texture is a mark of quality by itself: they are different preparations. Ask what is currently available and how it is served.' },
        { heading: 'What to check when ordering Valencian paella', body: 'Valencian paella is a specific recipe, not a generic name for every rice dish. Confirm current availability, ingredients and advance-order requirements on the active menu. Discuss allergies or adaptations before booking.', items: ['Check whether the dish must be ordered in advance.', 'Confirm serving numbers and whole-table requirements.', 'Ask about ingredients, supplements and allergens.'] },
        { heading: 'Your rice-meal checklist', checklist: true, body: 'Keep this list to compare options using more than a photograph.', items: ['Date, time and party size.', 'The texture and dish you want to share.', 'Published minimum party size, price, drinks and supplements.', 'Allergies, intolerances and other requirements communicated.', 'Availability and conditions confirmed by the restaurant.'] },
        { heading: 'How this guide relates to Villa Carmen', body: 'Our rice page links to the dishes and conditions on the active Rice Menu. This guide is permanent editorial content; menus and availability can change, so the menu page and our team’s confirmation take precedence.' },
      ],
      faq: [
        { question: 'Do paella and Valencian rice mean the same thing?', answer: 'Not necessarily. Valencian paella is a specific dish; other dry and creamy rice dishes use different ingredients and serving styles.' },
        { question: 'Can I use this checklist for a group?', answer: 'Yes. Note your party size, dietary needs and preferred menu, then confirm its specific conditions with the restaurant.' },
        { question: 'Are the dishes always available?', answer: 'No. This guide explains concepts. Current dishes appear on the published menus and availability should be confirmed before booking.' },
      ],
    },
  },
  '/checklist-celebraciones': {
    es: {
      kicker: 'Planificación práctica y reutilizable',
      title: 'Checklist para bodas, comuniones y celebraciones',
      intro: 'Organiza la primera conversación con el restaurante y los proveedores con una lista clara. Está pensada para bodas, comuniones, comidas familiares y eventos de empresa en Catarroja.',
      image: 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_2.webp',
      imageAlt: 'Salón de Alquería Villa Carmen preparado para una celebración', imageWidth: 3000, imageHeight: 2000,
      imageCaption: 'Fotografía del archivo propio de Villa Carmen, servida desde su CDN. Autor no identificado en el archivo. Las fotos de celebraciones privadas requieren permiso y crédito.',
      downloads: [{ href: '/downloads/villa-carmen-checklist-celebraciones-es.html', filename: 'villa-carmen-checklist-celebraciones.html', label: 'Descargar checklist en HTML (imprimible)' }],
      sections: [
        { heading: '1. Define el plan antes de pedir propuesta', checklist: true, items: ['Fecha preferida y alternativas, franja horaria y tipo de celebración.', 'Número estimado de adultos y niños; no confundas estimación con aforo confirmado.', 'Espacios que te interesan y alternativa ante lluvia o cambios de montaje.', 'Objetivos del evento, ambiente y prioridades de los asistentes.'] },
        { heading: '2. Revisa menú y necesidades de los asistentes', checklist: true, items: ['Platos, bebidas, café, suplementos y condiciones por escrito.', 'Alergias, intolerancias y adaptaciones consultadas con el equipo.', 'Mínimo de comensales, elección de platos y fecha límite para confirmarlos.', 'Opciones para niños si están disponibles en la propuesta actual.'] },
        { heading: '3. Coordina espacios, tiempos y proveedores', checklist: true, items: ['Recorrido de ceremonia, aperitivo, comida y celebración.', 'Horarios de acceso, montaje, recogida y contactos de cada proveedor.', 'Plano de mesas, accesibilidad y necesidades técnicas confirmadas.', 'Permiso escrito antes de publicar fotografías de invitados o celebraciones privadas; acredita a sus autores.'] },
        { heading: '4. Cierra confirmaciones y conserva el acuerdo', checklist: true, items: ['Número final de asistentes y fecha límite de cambios.', 'Menú, espacio, horarios, precio y condiciones confirmados por escrito.', 'Contacto operativo para el día y responsable de cada decisión.', 'Presupuesto y pagos registrados sin incluir datos privados en documentos compartidos.'] },
      ],
      faq: [
        { question: '¿Esta checklist confirma un aforo o una fecha?', answer: 'No. Es una herramienta de planificación. El restaurante confirma el aforo para el montaje, los espacios y la disponibilidad de cada fecha.' },
        { question: '¿Puedo compartirla con proveedores?', answer: 'Sí. Comparte solo la información necesaria y evita difundir datos personales de invitados.' },
        { question: '¿Cómo pido una propuesta en Villa Carmen?', answer: 'Usa Contacto e incluye fecha, tipo de celebración, número aproximado de asistentes y cualquier necesidad importante. Revisa también los menús publicados.' },
      ],
    },
    en: {
      kicker: 'Practical, reusable planning',
      title: 'Wedding, communion and celebration checklist',
      intro: 'Prepare your first conversation with the restaurant and suppliers using one clear list. It is designed for weddings, communions, family meals and company events in Catarroja.',
      image: 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_2.webp',
      imageAlt: 'A room at Alqueria Villa Carmen prepared for a celebration', imageWidth: 3000, imageHeight: 2000,
      imageCaption: 'Photograph from Villa Carmen’s own media archive, served from its CDN. No author is identified in the file. Private-event photographs require permission and credit.',
      downloads: [{ href: '/downloads/villa-carmen-checklist-celebraciones-en.html', filename: 'villa-carmen-celebration-checklist.html', label: 'Download the printable HTML checklist' }],
      sections: [
        { heading: '1. Define the plan before requesting a proposal', checklist: true, items: ['Preferred and alternative dates, time of day and celebration type.', 'Estimated adults and children; an estimate is not a confirmed capacity.', 'Preferred spaces and a wet-weather or layout alternative.', 'Event goals, atmosphere and guest priorities.'] },
        { heading: '2. Review the menu and guest requirements', checklist: true, items: ['Dishes, drinks, coffee, supplements and written conditions.', 'Allergies, intolerances and adaptations discussed with the team.', 'Minimum party size, dish choices and confirmation deadline.', 'Children’s options where included in the current proposal.'] },
        { heading: '3. Coordinate spaces, timings and suppliers', checklist: true, items: ['The flow from ceremony to drinks, meal and celebration.', 'Access, setup and collection times plus supplier contacts.', 'Table plan, accessibility and confirmed technical needs.', 'Written permission before publishing private-event or guest photographs; credit the creators.'] },
        { heading: '4. Close confirmations and keep the agreement', checklist: true, items: ['Final guest count and change deadline.', 'Menu, space, timings, price and conditions confirmed in writing.', 'Operational contact for the day and an owner for each decision.', 'Budget and payments recorded without private data in shared documents.'] },
      ],
      faq: [
        { question: 'Does this checklist confirm capacity or a date?', answer: 'No. It is a planning tool. The restaurant confirms capacity for your layout, spaces and availability for each date.' },
        { question: 'Can I share it with suppliers?', answer: 'Yes. Share only necessary information and do not distribute guests’ personal data.' },
        { question: 'How do I request a Villa Carmen proposal?', answer: 'Use Contact with your date, celebration type, approximate party size and important requirements. You can also review the published menus first.' },
      ],
    },
  },
}
