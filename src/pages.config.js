import Budget from './pages/Budget';
import Dashboard from './pages/Dashboard';
import ExecutiveStatus from './pages/ExecutiveStatus';
import Homologation from './pages/Homologation';
import Migration from './pages/Migration';
import Products from './pages/Products';
import ProjectsList from './pages/ProjectsList';
import Reports from './pages/Reports';
import Risks from './pages/Risks';
import Stakeholders from './pages/Stakeholders';
import Team from './pages/Team';
import Timeline from './pages/Timeline';
import Trainings from './pages/Trainings';
import Travels from './pages/Travels';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Budget": Budget,
    "Dashboard": Dashboard,
    "ExecutiveStatus": ExecutiveStatus,
    "Homologation": Homologation,
    "Migration": Migration,
    "Products": Products,
    "ProjectsList": ProjectsList,
    "Reports": Reports,
    "Risks": Risks,
    "Stakeholders": Stakeholders,
    "Team": Team,
    "Timeline": Timeline,
    "Trainings": Trainings,
    "Travels": Travels,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};