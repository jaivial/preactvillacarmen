import type { EditorialContent } from '../components/EditorialLanding'
import type { Lang } from './i18n'

export const riceContent: Record<Lang, EditorialContent> = {
  es: {
    kicker: 'Cocina mediterránea en Catarroja',
    title: 'Arrocería en Catarroja: arroces y paella valenciana',
    intro: 'Descubre los arroces de Alquería Villa Carmen: secos, melosos y propuestas mediterráneas para compartir en Catarroja, Valencia. Consulta los platos disponibles y las condiciones de cada menú antes de reservar.',
    image: 'https://villacarmenmedia.b-cdn.net/1/pictures/menupreviewpictures/1/preview-1787247695442.webp',
    imageAlt: 'Paellera de arroz servida en una mesa de Alquería Villa Carmen',
    imageWidth: 1024,
    imageHeight: 1024,
    links: [{ href: '/menu/menu-fin-de-semana', label: 'Menú de fin de semana' }, { href: '/restaurante-albufera-catarroja', label: 'Comer cerca de l’Albufera' }, { href: '/contacto', label: 'Cómo llegar desde Valencia' }],
    sections: [
      { heading: 'Arroces secos y melosos, con producto mediterráneo', body: 'Entre las especialidades publicadas actualmente están la paella valenciana y la paella valenciana de la Albufera —ambas por encargo—, el arroz del senyoret y preparaciones secas y melosas. La carta cambia con la propuesta de cada menú; consulta su ficha completa para conocer la disponibilidad.' },
      { heading: 'Paella valenciana por encargo', body: 'La carta publica paella valenciana y paella valenciana de la Albufera, ambas por encargo. Para encargar arroz el mínimo es de dos personas. Confirma con el equipo la antelación, la preparación elegida y los suplementos del menú vigente.' },
      { heading: 'Venir a comer paella desde Valencia', body: 'Estamos en Catarroja, en la provincia de Valencia, no en Valencia ciudad ni en El Palmar. Consulta la dirección y la ruta en Contacto para organizar la comida; puedes combinarla con una visita al Port de Catarroja.' },
      { heading: 'El punto del arroz y el trabajo de nuestro equipo', body: 'En cocina cuidamos el caldo, el punto y el tiempo de reposo de cada preparación. Nuestro equipo coordina la elección de arroces de las mesas de grupo para organizar el servicio y atender las condiciones indicadas en cada menú.' },
      { heading: 'Condiciones de los menús con arroz', body: 'Las condiciones dependen del menú elegido. Consulta el mínimo de comensales, la organización por mesa, las bebidas y cualquier suplemento directamente en el menú. El equipo puede resolver dudas sobre alérgenos antes de confirmar la reserva.' },
    ],
    faq: [
      { question: '¿Qué arroces puedo pedir?', answer: 'La lista de esta página procede del menú de fin de semana cuando está activo y elimina platos repetidos. También enlazamos el menú del día y el Menú Arrocero si están activos; abre cada menú para consultar su propuesta completa y actualizada.' },
      { question: '¿Los arroces se sirven para una persona o para compartir?', answer: 'Para encargar arroz el mínimo es de dos personas. El menú de fin de semana no exige un mínimo de comensales para reservar; los menús de grupos son a partir de seis. Revisa además las condiciones de elección de arroces de cada menú.' },
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
    links: [{ href: '/menu/menu-fin-de-semana', label: 'Weekend menu' }, { href: '/restaurante-albufera-catarroja', label: 'Lunch near l’Albufera' }, { href: '/contacto', label: 'Directions from Valencia' }],
    sections: [
      { heading: 'Dry and creamy rice with Mediterranean ingredients', body: 'Current published specialities include Valencian paella and Albufera-style Valencian paella —both by prior order—, senyoret rice, and dry and creamy rice dishes. The selection changes with each menu; check its full page for current availability.' },
      { heading: 'Valencian paella by prior order', body: 'The menu lists Valencian paella and Albufera-style Valencian paella, both by prior order. Rice orders are for at least two people. Confirm the notice required, preparation and current menu supplements with our team.' },
      { heading: 'Coming from Valencia for paella', body: 'We are in Catarroja, in the province of Valencia, not in Valencia city or El Palmar. Use the address and directions on Contact to plan your meal, perhaps after a visit to Catarroja port.' },
      { heading: 'Cooking rice and working as a team', body: 'Our kitchen pays attention to the stock, texture and resting time of every preparation. The team coordinates rice choices for group tables to organise service and follow the conditions shown on each menu.' },
      { heading: 'Conditions for menus with rice', body: 'Conditions vary by menu. Check the minimum party size, table arrangements, drinks and any supplements on the menu itself. Ask our team about allergens before confirming your booking.' },
    ],
    faq: [
      { question: 'Which rice dishes can I order?', answer: 'The list on this page comes from the weekend menu when active, with duplicate dishes removed. We also link to the set lunch and Rice menus when active; open each menu for its complete, up-to-date selection.' },
      { question: 'Are rice dishes for one person or for sharing?', answer: 'Rice orders are for at least two people. The weekend menu has no minimum party size for a booking; group menus start at six people. Check each menu for additional rice-selection conditions.' },
      { question: 'How do I book a meal with rice?', answer: 'Check availability under Bookings or contact us directly. For groups, first review the menu conditions and the notice required to choose your rice dishes.' },
    ],
  },
}
