import type { EditorialContent } from '../components/EditorialLanding'
import type { Lang } from './i18n'

export const celebrationContent: Record<string, Record<Lang, EditorialContent>> = {
  '/bodas': {
    es: {
      kicker: 'Celebraciones en Alquería Villa Carmen',
      title: 'Bodas en Catarroja',
      intro: 'Una boda se construye con vuestro ritmo, vuestros invitados y vuestro estilo. En Villa Carmen ponemos los salones, los jardines, la cocina mediterránea y un equipo que os acompaña desde la primera propuesta.',
      image: 'https://villacarmenmedia.b-cdn.net/images/eventos/bodas/16%3A9/boda16-9_2.webp',
      imageAlt: 'Celebración de boda en los espacios de Alquería Villa Carmen',
      sections: [
        { heading: 'Ceremonia, cóctel y banquete en un mismo entorno', body: 'Podemos plantear la celebración entre jardines y salones según la fecha, el número de invitados y el ambiente que busquéis. La distribución definitiva se acuerda con el equipo para que cada momento tenga su espacio.' },
        { heading: 'Una propuesta gastronómica para compartir', body: 'La cocina mediterránea y los arroces forman parte de la identidad de la casa. Revisad los menús publicados y contadnos vuestras preferencias; el equipo os orientará sobre platos, bebidas, suplementos y alérgenos.' },
        { heading: 'Del primer contacto al montaje del día', body: 'Contadnos la fecha, el aforo previsto y cómo imagináis la ceremonia y la comida. Después concretaremos disponibilidad, espacios, recorrido de la celebración, montaje y condiciones por escrito.', items: ['Primera conversación y comprobación de disponibilidad.', 'Propuesta de espacio, menú y organización.', 'Confirmación de invitados, montaje y necesidades especiales.'] },
      ],
      faq: [
        { question: '¿Cuántos invitados pueden asistir?', answer: 'No aplicamos una cifra genérica a todas las bodas. La capacidad depende del salón, los espacios elegidos y el montaje; consúltanos con tu fecha y aforo previsto.' },
        { question: '¿Podemos celebrar la ceremonia y el banquete aquí?', answer: 'Disponemos de jardines y salones y podemos estudiar una celebración completa. El equipo confirmará los espacios y el montaje posibles para vuestra fecha.' },
        { question: '¿Cómo pedimos una propuesta?', answer: 'Escríbenos desde Contacto con la fecha, número aproximado de invitados y tipo de celebración. También puedes consultar antes los menús de grupos y nuestros arroces.' },
      ],
    },
    en: {
      kicker: 'Celebrations at Alqueria Villa Carmen', title: 'Weddings in Catarroja',
      intro: 'Your wedding should follow your pace, your guests and your style. Villa Carmen offers rooms, gardens, Mediterranean cuisine and a team to guide you from the first proposal.',
      image: 'https://villacarmenmedia.b-cdn.net/images/eventos/bodas/16%3A9/boda16-9_2.webp', imageAlt: 'Wedding celebration at Alqueria Villa Carmen',
      sections: [
        { heading: 'Ceremony, drinks reception and wedding breakfast', body: 'We can plan your celebration across gardens and rooms according to the date, guest count and atmosphere you want. The final layout is agreed with our team so each moment has its own space.' },
        { heading: 'Food made for sharing', body: 'Mediterranean cooking and rice dishes are part of our identity. Browse the published menus and tell us your preferences; we will advise on dishes, drinks, supplements and allergens.' },
        { heading: 'From first enquiry to the day itself', body: 'Tell us your date, estimated guest count and how you picture the ceremony and meal. We will then confirm availability, spaces, flow, layout and written terms.', items: ['Initial conversation and availability check.', 'Space, menu and planning proposal.', 'Confirmation of guests, layout and special requirements.'] },
      ],
      faq: [
        { question: 'How many guests can attend?', answer: 'There is no single figure for every wedding. Capacity depends on the room, chosen spaces and layout; ask us with your date and estimated guest count.' },
        { question: 'Can we hold both ceremony and meal here?', answer: 'We have gardens and rooms and can consider a complete celebration. Our team will confirm the spaces and layout available for your date.' },
        { question: 'How do we request a proposal?', answer: 'Use Contact to send your date, approximate guest count and celebration style. You can also browse group menus and our rice dishes first.' },
      ],
    },
  },
  '/comuniones': {
    es: {
      kicker: 'Una comida para disfrutar en familia', title: 'Restaurante para comuniones en Catarroja',
      intro: 'Celebrad la comunión con una comida pensada para juntar a familia y amigos. Os ayudamos a elegir espacio y menú para que mayores y pequeños disfrutéis del día con tranquilidad.',
      image: 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_2.webp', imageAlt: 'Salón para una celebración familiar en Alquería Villa Carmen',
      sections: [
        { heading: 'El espacio se adapta a vuestra celebración', body: 'La alquería cuenta con salones y jardines. Según la fecha, el número de asistentes y el tipo de comida, propondremos la ubicación y el montaje adecuados, sin dar por supuesta una capacidad única.' },
        { heading: 'Menús para compartir sin complicaciones', body: 'Consulta los menús de grupos publicados con precios, mínimo de comensales, bebidas y condiciones. Nuestro equipo puede explicarte la elección de platos y atender consultas sobre alérgenos antes de confirmar.' },
        { heading: 'Una planificación clara para las familias', body: 'Al escribirnos, indica la fecha, los adultos y niños previstos y cualquier necesidad importante. Confirmaremos disponibilidad, horario, menú y espacio para que sepas qué esperar antes del día.' },
      ],
      faq: [
        { question: '¿Hay un menú específico para niños?', answer: 'La oferta puede cambiar. Consulta los menús activos y pregúntanos por las opciones disponibles para los más pequeños antes de confirmar.' },
        { question: '¿Podemos conocer el espacio antes de decidir?', answer: 'Solicita una cita desde Contacto. El equipo te indicará disponibilidad para visitar las instalaciones y valorar el montaje de tu celebración.' },
        { question: '¿Qué información necesitáis para preparar una propuesta?', answer: 'Fecha, número aproximado de adultos y niños, horario deseado y cualquier necesidad alimentaria o de montaje.' },
      ],
    },
    en: {
      kicker: 'A meal for the whole family', title: 'Communion restaurant in Catarroja',
      intro: 'Celebrate a communion with a meal that brings family and friends together. We will help you choose the space and menu so adults and children can enjoy a relaxed day.',
      image: 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_2.webp', imageAlt: 'Room for a family celebration at Alqueria Villa Carmen',
      sections: [
        { heading: 'A space suited to your celebration', body: 'The alqueria has rooms and gardens. Depending on the date, party size and meal, we will suggest a suitable location and layout rather than assuming one fixed capacity.' },
        { heading: 'Straightforward menus for sharing', body: 'Browse published group menus with prices, minimum party sizes, drinks and conditions. Our team can explain dish choices and answer allergen questions before you confirm.' },
        { heading: 'Clear planning for families', body: 'When you write, include the date, expected adults and children and any important needs. We will confirm availability, timing, menu and space so you know what to expect.' },
      ],
      faq: [
        { question: 'Is there a specific children’s menu?', answer: 'The offer can change. Check active menus and ask us about current options for younger guests before confirming.' },
        { question: 'Can we see the space before deciding?', answer: 'Request an appointment through Contact. Our team will advise on visiting the venue and considering your celebration layout.' },
        { question: 'What do you need for a proposal?', answer: 'Your date, approximate numbers of adults and children, preferred time and any dietary or layout requirements.' },
      ],
    },
  },
  '/bautizos': {
    es: {
      kicker: 'Una comida familiar para recibir al bebé', title: 'Restaurante para bautizos en Catarroja',
      intro: 'Celebra el bautizo con una comida familiar tranquila en Catarroja, cerca de Valencia. Os ayudamos a elegir salón o jardín y menú para que la familia disfrute del día y vosotros podáis atender al bebé con calma.',
      image: 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_1.webp', imageAlt: 'Salón decorado con luces y plantas para una celebración familiar en Alquería Villa Carmen',
      sections: [
        { heading: 'Salón o jardín según la fecha y los invitados', body: 'La alquería tiene salones y jardines. Según la época del año, el número de invitados y el horario después de la ceremonia, os propondremos el espacio y el montaje adecuados.' },
        { heading: 'Menús de grupo con precio cerrado', body: 'Consulta los menús de grupos publicados con precio por persona, mínimo de comensales, bebidas y condiciones. Os orientamos sobre platos para compartir, opciones para los más pequeños y alérgenos antes de confirmar.' },
        { heading: 'Organizado en torno a la ceremonia', body: 'Indícanos la fecha, la hora aproximada de la ceremonia, cuántos adultos y niños vendréis y cualquier necesidad especial. Confirmaremos disponibilidad, horario, menú y espacio para que todo esté preparado cuando lleguéis.', items: ['Fecha y hora prevista de la ceremonia.', 'Adultos, niños y bebés que asistirán.', 'Necesidades de montaje, como espacio para carritos o tronas.'] },
      ],
      faq: [
        { question: '¿Podemos venir directamente después de la ceremonia?', answer: 'Indícanos la hora prevista de la ceremonia para ajustar el horario de la comida. El equipo confirmará el horario al cerrar la reserva.' },
        { question: '¿Hay menú para niños?', answer: 'La oferta puede cambiar. Consulta los menús activos y pregúntanos por las opciones disponibles para los más pequeños antes de confirmar.' },
        { question: '¿Qué necesitáis para preparar una propuesta?', answer: 'Fecha, hora de la ceremonia, número aproximado de adultos y niños y cualquier necesidad alimentaria o de montaje.' },
      ],
    },
    en: {
      kicker: 'A family meal to welcome the baby', title: 'Christening restaurant in Catarroja',
      intro: 'Celebrate a christening with a relaxed family meal in Catarroja, near Valencia. We will help you choose a room or garden and a menu so your family can enjoy the day while you look after the baby calmly.',
      image: 'https://villacarmenmedia.b-cdn.net/images/salones/16%3A9/salones16-9_1.webp', imageAlt: 'Room decorated with lights and plants for a family celebration at Alqueria Villa Carmen',
      sections: [
        { heading: 'A room or garden to suit your date and guests', body: 'The alqueria has rooms and gardens. Depending on the season, guest count and timing after the ceremony, we will suggest a suitable space and layout.' },
        { heading: 'Group menus at a set price', body: 'Browse published group menus with per-person prices, minimum party sizes, drinks and conditions. We will advise on sharing dishes, options for younger guests and allergens before you confirm.' },
        { heading: 'Planned around the ceremony', body: 'Tell us the date, approximate ceremony time, how many adults and children are coming and any special needs. We will confirm availability, timing, menu and space so everything is ready when you arrive.', items: ['Date and expected ceremony time.', 'Adults, children and babies attending.', 'Layout needs such as space for prams or high chairs.'] },
      ],
      faq: [
        { question: 'Can we come straight after the ceremony?', answer: 'Tell us the expected ceremony time so we can plan the meal around it. Our team will confirm timing when the booking is finalised.' },
        { question: 'Is there a children’s menu?', answer: 'The offer can change. Check active menus and ask us about current options for younger guests before confirming.' },
        { question: 'What do you need for a proposal?', answer: 'Your date, ceremony time, approximate numbers of adults and children and any dietary or layout requirements.' },
      ],
    },
  },
  '/eventos-empresa': {    es: {
      kicker: 'Reuniones y celebraciones con cocina mediterránea', title: 'Comidas y cenas de empresa en Catarroja',
      intro: 'Organiza una comida de equipo, una cena de Navidad, un encuentro con clientes o la celebración de tu empresa en Villa Carmen, en Catarroja, cerca de Valencia. Combinamos espacios, cocina y coordinación para que el objetivo del encuentro marque la propuesta.',
      image: '/images/discovery/banquete-dorado-800.jpg',
      imageSrcSet: '/images/discovery/banquete-dorado-480.webp 480w, /images/discovery/banquete-dorado-800.webp 800w',
      imageFallbackSrcSet: '/images/discovery/banquete-dorado-480.jpg 480w, /images/discovery/banquete-dorado-800.jpg 800w',
      imageSizes: '(max-width: 800px) calc(100vw - 40px), 1280px',
      imageWidth: 800, imageHeight: 600,
      imageAlt: 'Mesa de banquete dorado preparada para un evento de empresa en Alquería Villa Carmen',
      sections: [
        { heading: 'Un formato para cada encuentro', body: 'No todos los eventos necesitan el mismo montaje. Cuéntanos si se trata de una comida de equipo, presentación, reunión o celebración y revisaremos contigo el uso de salones y jardines.' },
        { heading: 'Menús y condiciones fáciles de consultar', body: 'Las fichas de grupos muestran las propuestas activas, precios por persona, mínimos, bebidas y suplementos. El equipo confirmará la selección final, los horarios y las necesidades alimentarias.' },
        { heading: 'Comidas y cenas de empresa de Navidad', body: 'Diciembre es la época más solicitada. Consulta el menú de grupos de Navidad publicado en Menús de grupos y escríbenos cuanto antes con la fecha y el número de asistentes para confirmar disponibilidad.' },
        { heading: 'Una propuesta ajustada a vuestro programa', body: 'Envíanos fecha, horario, asistentes, objetivo del evento y cualquier necesidad técnica o de montaje. Con esa información podremos valorar el espacio y responder con una propuesta concreta; cualquier equipamiento especial se confirma previamente.' },
      ],
      faq: [
        { question: '¿Podemos celebrar una comida de equipo entre semana?', answer: 'Consúltanos la fecha y el horario. La disponibilidad depende del calendario del restaurante y de otros eventos ya confirmados.' },
        { question: '¿Hay equipamiento para presentaciones?', answer: 'Indícanos qué necesitas. No damos por incluido ningún equipamiento audiovisual: el equipo confirmará lo disponible y las opciones para vuestro montaje.' },
        { question: '¿Cómo solicitamos un presupuesto?', answer: 'Utiliza Contacto e incluye fecha, asistentes, tipo de evento, horario y necesidades. Podéis enlazar el menú de grupos que mejor encaje como referencia.' },
      ],
    },
    en: {
      kicker: 'Meetings and celebrations with Mediterranean cuisine', title: 'Company lunches and dinners in Catarroja',
      intro: 'Organise a team meal, Christmas dinner, client gathering or company celebration at Villa Carmen in Catarroja, near Valencia. We combine spaces, cuisine and coordination around the purpose of your event.',
      image: '/images/discovery/banquete-dorado-800.jpg',
      imageSrcSet: '/images/discovery/banquete-dorado-480.webp 480w, /images/discovery/banquete-dorado-800.webp 800w',
      imageFallbackSrcSet: '/images/discovery/banquete-dorado-480.jpg 480w, /images/discovery/banquete-dorado-800.jpg 800w',
      imageSizes: '(max-width: 800px) calc(100vw - 40px), 1280px',
      imageWidth: 800, imageHeight: 600,
      imageAlt: 'Golden banquet table set for a company event at Alquería Villa Carmen',
      sections: [
        { heading: 'A format for every gathering', body: 'Not every event needs the same layout. Tell us whether it is a team meal, presentation, meeting or celebration and we will review how our rooms and gardens could work.' },
        { heading: 'Clear menus and conditions', body: 'Group menu pages show current options, per-person prices, minimums, drinks and supplements. Our team will confirm the final selection, schedule and dietary requirements.' },
        { heading: 'Christmas company lunches and dinners', body: 'December is the busiest season. Check the Christmas group menu under Group menus and contact us early with your date and guest count to confirm availability.' },
        { heading: 'A proposal shaped around your programme', body: 'Send your date, timing, guest count, event purpose and technical or layout needs. We can then assess the space and provide a specific proposal; special equipment is always confirmed in advance.' },
      ],
      faq: [
        { question: 'Can we hold a weekday team meal?', answer: 'Ask about your date and timing. Availability depends on the restaurant calendar and events already confirmed.' },
        { question: 'Is presentation equipment available?', answer: 'Tell us what you need. Audiovisual equipment is not automatically included; our team will confirm availability and options for your layout.' },
        { question: 'How do we request a quote?', answer: 'Use Contact with your date, guest count, event type, timing and requirements. You can include the group menu that best fits as a reference.' },
      ],
    },
  },
}
