import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Stakeholders from './pages/Stakeholders';
import Products from './pages/Products';
import Timeline from './pages/Timeline';
import Kanban from './pages/Kanban';
import Trainings from './pages/Trainings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Team": Team,
    "Stakeholders": Stakeholders,
    "Products": Products,
    "Timeline": Timeline,
    "Kanban": Kanban,
    "Trainings": Trainings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};