import { EditorialLanding, type EditorialContent } from '../../components/EditorialLanding'
import { useI18n, type Lang } from '../../lib/i18n'
import { SEARCH_SNAPSHOT, type SearchMetric } from '../../lib/searchSnapshot'

const CSV_PATH = '/downloads/villa-carmen-search-demand-2026-04-23_2026-10-22.csv'

const copy: Record<Lang, EditorialContent> = {
  es: {
    kicker: 'Datos agregados · Google Search Console',
    title: 'Cómo buscan un restaurante en Catarroja: seis meses de datos',
    intro: 'Un recurso reutilizable para medios, proveedores y profesionales locales: 285 clics y 5.201 impresiones observados entre el 23 de abril y el 22 de octubre de 2026. Publicamos solo agregados; no incluimos consultas individuales ni equiparamos clics con reservas.',
    downloads: [{ href: CSV_PATH, filename: 'villa-carmen-search-demand-2026-04-23_2026-10-22.csv', label: 'Descargar dataset agregado (CSV)' }],
    sections: [
      { heading: 'Qué contiene y cómo citarlo', body: 'Fuente: propiedad de dominio de Villa Carmen en Google Search Console, búsqueda web y datos finales. Exportado el 26 de octubre de 2026. Puedes reutilizar el CSV citando «Alquería Villa Carmen, Search Console, 23/04–22/10/2026» y enlazando esta página. No son datos de todos los restaurantes de Catarroja ni de otros negocios.' },
      { heading: 'Cómo leer las intenciones', body: 'Las categorías editoriales se solapan: una consulta puede contener marca y localidad. No sumes las filas de intención como si fueran totales independientes. En cambio, los dispositivos sí dividen el total de las 471 filas recibidas. La posición es la media ponderada por impresiones de las filas agregadas.' },
      { heading: 'Límites que importan', body: '«Sin filas devueltas» no significa que no exista demanda: significa que el filtro no devolvió filas en esta exportación. Los clics orgánicos no son llamadas, reservas ni clientes. No atribuimos cambios a acciones de marketing sin una comparación temporal y evidencia de conversión.' },
    ],
    faq: [
      { question: '¿Puedo publicar estos datos?', answer: 'Sí, como datos agregados de Villa Carmen, citando la fuente, el periodo y esta URL. No presentes sus cifras como un estudio de mercado de todos los restaurantes.' },
      { question: '¿Por qué no aparecen las búsquedas textuales?', answer: 'El recurso público minimiza datos y evita exponer consultas individuales. Las categorías y los dispositivos conservan la utilidad editorial sin publicar el detalle bruto.' },
      { question: '¿Qué significa CTR?', answer: 'Clics divididos entre impresiones dentro de las filas agregadas mostradas. La posición media se pondera por impresiones; no es una comprobación manual de rankings.' },
    ],
  },
  en: {
    kicker: 'Aggregate data · Google Search Console',
    title: 'How people search for a restaurant in Catarroja: six months of data',
    intro: 'A reusable resource for local media, suppliers and hospitality professionals: 285 clicks and 5,201 impressions observed from 23 April to 22 October 2026. Only aggregates are published; no individual queries are included, and clicks are not presented as bookings.',
    downloads: [{ href: CSV_PATH, filename: 'villa-carmen-search-demand-2026-04-23_2026-10-22.csv', label: 'Download the aggregate dataset (CSV)' }],
    sections: [
      { heading: 'What it contains and how to cite it', body: 'Source: Villa Carmen’s domain property in Google Search Console, web search and final data. Exported on 26 October 2026. You may reuse the CSV by citing “Alquería Villa Carmen, Search Console, 23 April–22 October 2026” and linking to this page. These figures do not describe every restaurant in Catarroja or any other business.' },
      { heading: 'How to read search intent', body: 'Editorial intent categories overlap: one query can include both brand and locality. Do not add intent rows as independent totals. Device categories, however, partition all 471 returned rows. Average position is weighted by impressions across the aggregated rows.' },
      { heading: 'Important limitations', body: '“No rows returned” does not mean there is no demand: it means the filter returned no rows in this export. Organic clicks are not calls, bookings or customers. We do not attribute changes to marketing without a time-based comparison and conversion evidence.' },
    ],
    faq: [
      { question: 'Can I publish these figures?', answer: 'Yes, as Villa Carmen’s aggregate data, citing the source, period and this URL. Do not present them as a market study of all restaurants.' },
      { question: 'Why are the textual searches not included?', answer: 'This public resource minimises data and avoids exposing individual queries. Categories and devices retain editorial value without publishing the raw detail.' },
      { question: 'What does CTR mean?', answer: 'Clicks divided by impressions within the displayed aggregate rows. Average position is weighted by impressions; it is not a manual ranking check.' },
    ],
  },
}

const intentLabels: Record<keyof typeof SEARCH_SNAPSHOT.intents, Record<Lang, string>> = {
  restaurant_catarroja: { es: 'Restaurante en Catarroja', en: 'Restaurant in Catarroja' },
  rice: { es: 'Arroz o paella', en: 'Rice or paella' },
  menus: { es: 'Menús', en: 'Menus' },
  groups: { es: 'Grupos', en: 'Groups' },
  weddings: { es: 'Bodas', en: 'Weddings' },
  communions: { es: 'Comuniones', en: 'Communions' },
  company_events: { es: 'Eventos de empresa', en: 'Company events' },
  brand: { es: 'Marca Villa Carmen', en: 'Villa Carmen brand' },
}

const deviceLabels: Record<keyof typeof SEARCH_SNAPSHOT.devices, Record<Lang, string>> = {
  MOBILE: { es: 'Móvil', en: 'Mobile' }, DESKTOP: { es: 'Ordenador', en: 'Desktop' }, TABLET: { es: 'Tableta', en: 'Tablet' },
}

function MetricTable({ title, labels, values, lang }: { title: string; labels: Record<string, Record<Lang, string>>; values: Record<string, SearchMetric>; lang: Lang }) {
  const number = new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-GB')
  const percent = new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-GB', { style: 'percent', maximumFractionDigits: 2 })
  const headers = lang === 'es' ? ['Segmento', 'Clics', 'Impresiones', 'CTR', 'Posición media'] : ['Segment', 'Clicks', 'Impressions', 'CTR', 'Average position']
  return <div class="editorial-data-table">
    <table>
      <caption>{title}</caption>
      <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
      <tbody>{Object.entries(values).map(([key, metric]) => <tr key={key}>
        <th scope="row">{labels[key][lang]}</th><td>{number.format(metric.clicks)}</td><td>{number.format(metric.impressions)}</td><td>{metric.impressions ? percent.format(metric.ctr) : '—'}</td><td>{metric.averagePosition === null ? '—' : number.format(metric.averagePosition)}</td>
      </tr>)}</tbody>
    </table>
  </div>
}

export function SearchDataResource() {
  const { lang } = useI18n()
  const total: SearchMetric = SEARCH_SNAPSHOT.total
  const number = new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-GB')
  const percent = new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-GB', { style: 'percent', maximumFractionDigits: 2 })
  return <EditorialLanding id="datos-busquedas-restaurante" content={copy[lang]}>
    <section class="container editorial-data" aria-label={lang === 'es' ? 'Datos agregados' : 'Aggregate data'}>
      <div class="editorial-data-summary">
        <div><strong>{number.format(total.clicks)}</strong>{lang === 'es' ? 'clics orgánicos' : 'organic clicks'}</div>
        <div><strong>{number.format(total.impressions)}</strong>{lang === 'es' ? 'impresiones' : 'impressions'}</div>
        <div><strong>{percent.format(total.ctr)}</strong>CTR</div>
      </div>
      <MetricTable title={lang === 'es' ? 'Categorías editoriales con solapamientos; no sumar como total.' : 'Overlapping editorial categories; do not add these as a total.'} labels={intentLabels} values={SEARCH_SNAPSHOT.intents} lang={lang} />
      <MetricTable title={lang === 'es' ? 'Dispositivos: partición del total exportado.' : 'Devices: a partition of the exported total.'} labels={deviceLabels} values={SEARCH_SNAPSHOT.devices} lang={lang} />
      <p class="editorial-data-note">{lang === 'es' ? `${total.rows} filas agregadas. Periodo: 23/04/2026–22/10/2026. El CSV contiene las categorías y dispositivos, no las consultas individuales.` : `${total.rows} aggregated rows. Period: 23 April–22 October 2026. The CSV contains categories and devices, not individual queries.`}</p>
    </section>
  </EditorialLanding>
}
