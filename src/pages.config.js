/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Budget from './pages/Budget';
import Home from './pages/Home';
import Homologation from './pages/Homologation';
import InternalDashboard from './pages/InternalDashboard';
import InternalProjectsList from './pages/InternalProjectsList';
import Migration from './pages/Migration';
import PortfolioSelect from './pages/PortfolioSelect';
import Products from './pages/Products';
import ProjectsList from './pages/ProjectsList';
import Reports from './pages/Reports';
import Risks from './pages/Risks';
import Stakeholders from './pages/Stakeholders';
import StatusReports from './pages/StatusReports';
import Team from './pages/Team';
import Travels from './pages/Travels';
import Dashboard from './pages/Dashboard';
import ExecutiveStatus from './pages/ExecutiveStatus';
import Timeline from './pages/Timeline';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Budget": Budget,
    "Home": Home,
    "Homologation": Homologation,
    "InternalDashboard": InternalDashboard,
    "InternalProjectsList": InternalProjectsList,
    "Migration": Migration,
    "PortfolioSelect": PortfolioSelect,
    "Products": Products,
    "ProjectsList": ProjectsList,
    "Reports": Reports,
    "Risks": Risks,
    "Stakeholders": Stakeholders,
    "StatusReports": StatusReports,
    "Team": Team,
    "Travels": Travels,
    "Dashboard": Dashboard,
    "ExecutiveStatus": ExecutiveStatus,
    "Timeline": Timeline,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};