import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Stakeholders from './pages/Stakeholders';
import Products from './pages/Products';
import Timeline from './pages/Timeline';
import Kanban from './pages/Kanban';
import Trainings from './pages/Trainings';
import Travels from './pages/Travels';
import Homologation from './pages/Homologation';
import Migration from './pages/Migration';
import Reports from './pages/Reports';
import Risks from './pages/Risks';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Team": Team,
    "Stakeholders": Stakeholders,
    "Products": Products,
    "Timeline": Timeline,
    "Kanban": Kanban,
    "Trainings": Trainings,
    "Travels": Travels,
    "Homologation": Homologation,
    "Migration": Migration,
    "Reports": Reports,
    "Risks": Risks,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};