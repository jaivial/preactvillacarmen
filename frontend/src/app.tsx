import { Route, Switch } from 'wouter-preact'
import { BackofficeLayout } from './routes/backoffice/BackofficeLayout.tsx'
import { BackofficeHome } from './routes/backoffice/BackofficeHome.tsx'
import { ClientLayout } from './routes/client/ClientLayout.tsx'
import { Contacto } from './routes/client/Contacto.tsx'
import { Home } from './routes/client/Home.tsx'
import { MenuDia } from './routes/client/MenuDia.tsx'
import { MenuFinde } from './routes/client/MenuFinde.tsx'
import { MenusDeGrupos } from './routes/client/MenusDeGrupos.tsx'
import { Postres } from './routes/client/Postres.tsx'
import { Placeholder } from './routes/client/Placeholder.tsx'
import { Vinos } from './routes/client/Vinos.tsx'

function ClientApp() {
  return (
    <ClientLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/contacto" component={Contacto} />

        <Route path="/menufindesemana" component={MenuFinde} />
        <Route path="/menudeldia" component={MenuDia} />
        <Route path="/menusdegrupos" component={MenusDeGrupos} />
        <Route path="/postres" component={Postres} />
        <Route path="/vinos" component={Vinos} />
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
