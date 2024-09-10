import React from 'react';
import { Helmet } from 'react-helmet';
import { Header } from './Header';
import { FooterFun } from './FooterFun';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      // maxWidth: '64rem',
      margin: '0 auto',
      // padding: '2rem 0',
    }}>
      <Helmet>
        <title>reactives.fun</title>
        <meta name="description" content="Reactives Chain Funny a gameFi on Cosmos" />
        <link rel="icon" href="/favicon.png" />
      </Helmet>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Header />
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <FooterFun />
      </div>
    </div>
  );
}