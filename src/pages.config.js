import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Stakeholders from './pages/Stakeholders';
import Products from './pages/Products';
import Timeline from './pages/Timeline';
import Trainings from './pages/Trainings';
import Travels from './pages/Travels';
import Homologation from './pages/Homologation';
import Migration from './pages/Migration';
import Reports from './pages/Reports';
import Risks from './pages/Risks';
import ProjectsList from './pages/ProjectsList';
import Budget from './pages/Budget';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Team": Team,
    "Stakeholders": Stakeholders,
    "Products": Products,
    "Timeline": Timeline,
    "Trainings": Trainings,
    "Travels": Travels,
    "Homologation": Homologation,
    "Migration": Migration,
    "Reports": Reports,
    "Risks": Risks,
    "ProjectsList": ProjectsList,
    "Budget": Budget,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};