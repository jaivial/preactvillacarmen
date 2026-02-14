import { Route, Switch } from 'wouter-preact'
import { BackofficeLayout } from './routes/backoffice/BackofficeLayout.tsx'
import { BackofficeHome } from './routes/backoffice/BackofficeHome.tsx'
import { ClientLayout } from './routes/client/ClientLayout.tsx'
import { Contacto } from './routes/client/Contacto.tsx'
import { Home } from './routes/client/Home.tsx'
import { Placeholder } from './routes/client/Placeholder.tsx'

function ClientApp() {
  return (
    <ClientLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/contacto" component={Contacto} />

        <Route path="/menufindesemana" component={() => <Placeholder titleKey="nav.weekendMenu" />} />
        <Route path="/menudeldia" component={() => <Placeholder titleKey="nav.dailyMenu" />} />
        <Route path="/menusdegrupos" component={() => <Placeholder titleKey="nav.groupMenus" />} />
        <Route path="/postres" component={() => <Placeholder titleKey="nav.desserts" />} />
        <Route path="/vinos" component={() => <Placeholder titleKey="nav.wines" />} />
        <Route path="/reservas" component={() => <Placeholder titleKey="nav.reservations" />} />
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
