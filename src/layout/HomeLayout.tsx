import { Outlet } from "react-router-dom";
import logo from "../assets/logo1.svg";
import "./HomeLayout.css";

export default function HomeLayout() {
  return (
    <div className="home-layout">
      {/* Left Section — Auth Forms */}
      <div className="home-layout__left">
        <div className="home-layout__form-wrapper">
          <Outlet />
        </div>
      </div>

      {/* Right Section — Brand Visual */}
      <div className="home-layout__right">
        {/* Glow Orb — Top Center */}
        <div className="glow-orb glow-orb--top" />

        {/* Glow Orb — Right Side */}
        <div className="glow-orb glow-orb--right" />

        {/* Glow Orb — Bottom Center */}
        <div className="glow-orb glow-orb--bottom" />

        {/* Center Logo */}
        <div className="home-layout__logo-wrap">
          <img
            src={logo}
            alt="Logo"
            className="home-layout__logo"
          />
        </div>

        {/* Subtle Grid Lines */}
        <div className="home-layout__grid" />
      </div>
    </div>
  );
}

