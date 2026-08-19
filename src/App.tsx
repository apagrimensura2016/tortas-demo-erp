import { useState } from "react";
import { useApp } from "./lib/store";
import Login from "./views/Login";
import Dashboard from "./views/Dashboard";
import Orders, { NewOrderModal } from "./views/Orders";
import CalendarView from "./views/CalendarView";
import Clients from "./views/Clients";
import Products from "./views/Products";
import Inventory from "./views/Inventory";
import Cash from "./views/Cash";
import Delivery from "./views/Delivery";
import Audit from "./views/Audit";
import OrderDrawer from "./components/OrderDrawer";
import { Header, Sidebar } from "./components/layout";
import { Toasts } from "./components/ui";

function Shell() {
  const view = useApp((s) => s.view);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen relative z-10">
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="flex-1">
          {view === "dashboard" && <Dashboard />}
          {view === "pedidos" && <Orders />}
          {view === "reservas" && <CalendarView />}
          {view === "clientes" && <Clients />}
          {view === "productos" && <Products />}
          {view === "inventario" && <Inventory />}
          {view === "caja" && <Cash />}
          {view === "reparto" && <Delivery />}
          {view === "auditoria" && <Audit />}
        </main>
      </div>
      <OrderDrawer />
      <NewOrderModal />
    </div>
  );
}

export default function App() {
  const currentUserId = useApp((s) => s.currentUserId);
  return (
    <>
      <div className="sprinkles" aria-hidden />
      <div className="noise" aria-hidden />
      {currentUserId ? <Shell /> : <Login />}
      <Toasts />
    </>
  );
}
