
import { Outlet } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import './Layout.css';

const Layout = () => {
  return (
    <div className="app-layout">
      <Header />

      <main className="app-main">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default Layout;
