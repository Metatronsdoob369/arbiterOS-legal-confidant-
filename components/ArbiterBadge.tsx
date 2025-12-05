
import React from 'react';
import styled from 'styled-components';

export const ArbiterBadge: React.FC = () => {
  return (
    <StyledWrapper>
      <div className="outer">
        <div className="dot" />
        <div className="card">
          <div className="ray" />
          <div className="content-row">
            <div className="icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            </div>
            <div className="text-col">
                <span className="title">Arbiter Node</span>
                <span className="subtitle">Verified System</span>
            </div>
          </div>
          <div className="line topl" />
          <div className="line leftl" />
          <div className="line bottoml" />
          <div className="line rightl" />
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .outer {
    width: 160px;
    height: 42px;
    border-radius: 6px;
    padding: 1px;
    background: radial-gradient(circle 230px at 0% 0%, #ffffff, #0c0d0d);
    position: relative;
    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  }

  .dot {
    width: 3px;
    aspect-ratio: 1;
    position: absolute;
    background-color: #fff;
    box-shadow: 0 0 8px #ffffff;
    border-radius: 100px;
    z-index: 2;
    right: 10%;
    top: 10%;
    animation: moveDot 6s linear infinite;
  }

  @keyframes moveDot {
    0%, 100% { top: 0%; right: 0%; }
    25% { top: 0%; right: 100%; }
    50% { top: 100%; right: 100%; }
    75% { top: 100%; right: 0%; }
  }

  .card {
    z-index: 1;
    width: 100%;
    height: 100%;
    border-radius: 5px;
    border: solid 1px #202222;
    background: radial-gradient(circle 280px at 0% 0%, #2a2a2a, #0c0d0d);
    display: flex;
    align-items: center;
    position: relative;
    overflow: hidden;
  }

  .ray {
    width: 100px;
    height: 150px;
    border-radius: 100px;
    position: absolute;
    background-color: #c7c7c7;
    opacity: 0.15;
    box-shadow: 0 0 50px #fff;
    filter: blur(10px);
    transform-origin: 10%;
    top: -50%;
    left: -20%;
    transform: rotate(40deg);
    animation: rayMove 10s infinite linear;
  }

  @keyframes rayMove {
      0% { transform: rotate(40deg) translate(0,0); opacity: 0.15; }
      50% { transform: rotate(50deg) translate(10px, 10px); opacity: 0.25; }
      100% { transform: rotate(40deg) translate(0,0); opacity: 0.15; }
  }

  .content-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 12px;
      z-index: 10;
  }

  .icon {
      color: #d4af37;
      width: 16px;
      height: 16px;
      filter: drop-shadow(0 0 5px rgba(212, 175, 55, 0.5));
  }

  .text-col {
      display: flex;
      flex-direction: column;
      justify-content: center;
  }

  .title {
    font-weight: 800;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    background: linear-gradient(45deg, #e5e5e5, #ffffff, #999999);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
  }

  .subtitle {
      font-size: 8px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.05em;
  }

  .line {
    position: absolute;
    background-color: #2c2c2c;
  }
  
  .topl { top: 0; left: 10%; width: 80%; height: 1px; background: linear-gradient(90deg, transparent, #555, transparent); }
  .bottoml { bottom: 0; left: 10%; width: 80%; height: 1px; background: linear-gradient(90deg, transparent, #555, transparent); }
  .leftl { left: 0; top: 10%; height: 80%; width: 1px; background: linear-gradient(180deg, transparent, #555, transparent); }
  .rightl { right: 0; top: 10%; height: 80%; width: 1px; background: linear-gradient(180deg, transparent, #555, transparent); }
`;
