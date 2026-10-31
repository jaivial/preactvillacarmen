import type { EditorialContent } from '../components/EditorialLanding'
import type { Lang } from './i18n'

export const riceContent: Record<Lang, EditorialContent> = {
  es: {
    kicker: 'Cocina mediterránea en Catarroja',
    title: 'Arrocería en Catarroja: arroces y paellas',
    intro: 'Descubre los arroces de Alquería Villa Carmen: secos, melosos y propuestas mediterráneas para compartir en Catarroja, Valencia. Consulta los platos disponibles y las condiciones de cada menú antes de reservar.',
    image: 'https://villacarmenmedia.b-cdn.net/1/pictures/menupreviewpictures/1/preview-1787247695442.webp',
    imageAlt: 'Paellera de arroz servida en una mesa de Alquería Villa Carmen',
    imageWidth: 1024,
    imageHeight: 1024,
    sections: [
      { heading: 'Arroces secos y melosos, con producto mediterráneo', body: 'Entre las especialidades publicadas actualmente están la paella valenciana y la paella valenciana de la Albufera —ambas por encargo—, el arroz del senyoret y preparaciones secas y melosas. La carta cambia con la propuesta de cada menú; consulta su ficha completa para conocer la disponibilidad.' },
      { heading: 'El punto del arroz y el trabajo de nuestro equipo', body: 'En cocina cuidamos el caldo, el punto y el tiempo de reposo de cada preparación. Nuestro equipo coordina la elección de arroces de las mesas de grupo para organizar el servicio y atender las condiciones indicadas en cada menú.' },
      { heading: 'Condiciones de los menús con arroz', body: 'Las condiciones dependen del menú elegido. Consulta el mínimo de comensales, la organización por mesa, las bebidas y cualquier suplemento directamente en el menú. El equipo puede resolver dudas sobre alérgenos antes de confirmar la reserva.' },
    ],
    faq: [
      { question: '¿Qué arroces puedo pedir?', answer: 'La lista de esta página procede del menú de fin de semana cuando está activo y elimina platos repetidos. También enlazamos el menú del día y el Menú Arrocero si están activos; abre cada menú para consultar su propuesta completa y actualizada.' },
      { question: '¿Los arroces se sirven para una persona o para compartir?', answer: 'Depende de la carta o menú. En el Menú Arrocero de grupo rigen las condiciones de mesa completa y el mínimo de comensales indicados en su ficha. Consúltanos para otras opciones.' },
      { question: '¿Cómo reservo una comida con arroces?', answer: 'Puedes consultar disponibilidad en Reservas o escribirnos desde Contacto. Para grupos, revisa primero las condiciones del menú y la antelación necesaria para elegir los arroces.' },
    ],
  },
  en: {
    kicker: 'Mediterranean cuisine in Catarroja',
    title: 'Rice restaurant in Catarroja: rice and paella',
    intro: 'Explore rice at Alqueria Villa Carmen: dry and creamy rice dishes and Mediterranean menus for sharing in Catarroja, Valencia. Check current dishes and each menu’s conditions before booking.',
    image: 'https://villacarmenmedia.b-cdn.net/1/pictures/menupreviewpictures/1/preview-1787247695442.webp',
    imageAlt: 'A pan of rice served on a table at Alqueria Villa Carmen',
    imageWidth: 1024,
    imageHeight: 1024,
    sections: [
      { heading: 'Dry and creamy rice with Mediterranean ingredients', body: 'Current published specialities include Valencian paella and Albufera-style Valencian paella —both by prior order—, senyoret rice, and dry and creamy rice dishes. The selection changes with each menu; check its full page for current availability.' },
      { heading: 'Cooking rice and working as a team', body: 'Our kitchen pays attention to the stock, texture and resting time of every preparation. The team coordinates rice choices for group tables to organise service and follow the conditions shown on each menu.' },
      { heading: 'Conditions for menus with rice', body: 'Conditions vary by menu. Check the minimum party size, table arrangements, drinks and any supplements on the menu itself. Ask our team about allergens before confirming your booking.' },
    ],
    faq: [
      { question: 'Which rice dishes can I order?', answer: 'The list on this page comes from the weekend menu when active, with duplicate dishes removed. We also link to the set lunch and Rice menus when active; open each menu for its complete, up-to-date selection.' },
      { question: 'Are rice dishes for one person or for sharing?', answer: 'It depends on the menu. The group Rice Menu has whole-table conditions and the minimum party size stated on its page. Ask us about other options.' },
      { question: 'How do I book a meal with rice?', answer: 'Check availability under Bookings or contact us directly. For groups, first review the menu conditions and the notice required to choose your rice dishes.' },
    ],
  },
}
