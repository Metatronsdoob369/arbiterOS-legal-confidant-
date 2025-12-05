
import React from 'react';
import styled from 'styled-components';

export const ThemeToggle: React.FC = () => {
  return (
    <StyledWrapper>
      <div className="toggle-container">
        <input id="theme-switch" type="checkbox" />
        <div className="app">
          <div className="body">
            <div className="phone">
              <div className="menu">
                <div className="time">4:20</div>
                <div className="icons">
                  <div className="network" />
                  <div className="battery" />
                </div>
              </div>
              <div className="content">
                <div className="circle">
                  <div className="crescent" />
                </div>
                <label htmlFor="theme-switch">
                  <div className="toggle" />
                  <div className="names">
                    <p className="light">Light</p>
                    <p className="dark">Dark</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .toggle-container {
    transform: scale(0.6); /* Scale down to fit sidebar */
    transform-origin: top left;
    width: 100%;
    height: 100%;
    min-height: 150px;
  }

  /* Phone */
  .phone {
    position: relative;
    z-index: 2;
    width: 18rem;
    height: 17rem;
    background-color: inherit;
    transition: background-color 0.6s;
    -webkit-box-shadow: 0 4px 35px rgba(0, 0, 0, 0.1);
    box-shadow: 0 4px 35px rgba(0, 0, 0, 0.1);
    border-radius: 40px;
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-orient: vertical;
    -webkit-box-direction: normal;
    -ms-flex-direction: column;
    flex-direction: column;
    border: 1px solid #333;
  }

  /* Top */
  .menu {
    font-size: 80%;
    opacity: 0.4;
    padding: 0.8rem 1.8rem;
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-pack: justify;
    -ms-flex-pack: justify;
    justify-content: space-between;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
  }

  .icons {
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    margin-top: 0.5rem;
  }

  .battery {
    width: 0.85rem;
    height: 0.45rem;
    background-color: #888;
  }

  .network {
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 6.8px 7.2px 6.8px;
    border-color: transparent transparent #888 transparent;
    -webkit-transform: rotate(135deg);
    -ms-transform: rotate(135deg);
    transform: rotate(135deg);
    margin: 0.12rem 0.5rem;
  }

  /* Middle */
  .content {
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-orient: vertical;
    -webkit-box-direction: normal;
    -ms-flex-direction: column;
    flex-direction: column;
    margin: auto;
    text-align: center;
    width: 70%;
    -webkit-transform: translateY(5%);
    -ms-transform: translateY(5%);
    transform: translateY(5%);
  }

  .circle {
    position: relative;
    border-radius: 100%;
    width: 8rem;
    height: 8rem;
    background: linear-gradient(
      40deg,
      #ff0080,
      #ff8c00,
      #e8e8e8,
      #8983f7,
      #a3dafb 80%
    );
    background-size: 400%;
    transition: background-position 0.6s;
    margin: auto;
  }

  .crescent {
    position: absolute;
    border-radius: 100%;
    right: 0;
    width: 6rem;
    height: 6rem;
    background: #e8e8e8;
    -webkit-transform: scale(0);
    -ms-transform: scale(0);
    transform: scale(0);
    -webkit-transform-origin: top right;
    -ms-transform-origin: top right;
    transform-origin: top right;
    transition: transform 0.6s cubic-bezier(0.645, 0.045, 0.355, 1), background-color 0.6s;
  }

  label,
  .toggle {
    height: 2.8rem;
    border-radius: 100px;
  }

  label {
    width: 100%;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 100px;
    position: relative;
    margin: 1.8rem 0 4rem 0;
    cursor: pointer;
  }

  .toggle {
    position: absolute;
    width: 50%;
    background-color: #fff;
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.15);
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .names {
    font-size: 90%;
    font-weight: bolder;
    color: #888;
    width: 65%;
    margin-left: 17.5%;
    margin-top: 6.5%;
    position: absolute;
    display: flex;
    justify-content: space-between;
    user-select: none;
  }

  .dark {
    opacity: 0.5;
  }

  .time {
    color: #888;
  }
  
  /* -------- Switch Styles ------------*/
  [type="checkbox"] {
    display: none;
  }
  
  /* Toggle */
  [type="checkbox"]:checked + .app .toggle {
    transform: translateX(100%);
    background-color: #34323d;
  }

  [type="checkbox"]:checked + .app .dark {
    opacity: 1;
    color: white;
  }

  [type="checkbox"]:checked + .app .light {
    opacity: 1;
    color: white;
  }
  
  /* App */
  [type="checkbox"]:checked + .app .phone {
    background-color: #26242e;
    color: white;
  }
  
  /* Circle */
  [type="checkbox"]:checked + .app .crescent {
    transform: scale(1);
    background: #26242e;
  }

  [type="checkbox"]:checked + .app .circle {
    background-position: 100% 100%;
  }

  [type="checkbox"]:checked + .time {
    color: white;
  }

  [type="checkbox"]:checked + .app .body .phone .menu .time {
    color: white;
  }

  [type="checkbox"]:checked + .app .body .phone .menu .icons .network {
    border-color: transparent transparent white transparent;
  }

  [type="checkbox"]:checked + .app .body .phone .menu .icons .battery {
    background-color: white;
  }
`;
