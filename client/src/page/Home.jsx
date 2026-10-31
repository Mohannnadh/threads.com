
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { getProducts } from '../services/productService.js';

const Home = () => {
  // Products the admin has marked as featured.
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    let active = true;

    getProducts({ limit: 4, featured: 'true' })
      .then((data) => {
        if (active) setFeatured(data.products || []);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#fff',
        color: '#111',
      }}
    >
      

      <main>
        {/* Hero */}
        <section
          style={{
            minHeight: '650px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 32px',
            borderBottom: '1px solid #111',
            backgroundColor: '#f3f1ed',
          }}
        >
          <div
            style={{
              maxWidth: '900px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                margin: '0 0 20px',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
              }}
            >
              THREADS.COM
            </p>

            <h1
              style={{
                margin: '0 auto 30px',
                maxWidth: '800px',
                fontSize: 'clamp(48px, 8vw, 110px)',
                lineHeight: '0.9',
                letterSpacing: '-0.06em',
                fontWeight: '600',
                color:'#111',
              }}
            >
              EVERYDAY
              <br />
              ESSENTIALS.
            </h1>

            <p
              style={{
                maxWidth: '500px',
                margin: '0 auto 30px',
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#555',
              }}
            >
              Premium T-shirts designed for everyday wear.
              Simple, comfortable and made to last.
            </p>

            <button
              type="button"
              onClick={() => window.location.href = '/products'}
              style={{
                border: '1px solid #111',
                backgroundColor: '#111',
                color: '#fff',
                padding: '14px 28px',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              Shop All T-Shirts
            </button>
          </div>
        </section>

        {featured.length > 0 && (
          <section style={{ padding: '0 32px 80px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 500 }}>Featured</h2>
              <Link
                to="/products?featured=1"
                style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#111' }}
              >
                View all
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
              {featured.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Intro */}
        <section
          style={{
            padding: '100px 32px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: '0 0 14px',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#777',
            }}
          >
            OUR COLLECTION
          </p>

          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(32px, 5vw, 64px)',
              lineHeight: '1',
              letterSpacing: '-0.05em',
              fontWeight: '500',
              color:'#111',
            }}
          >
            Built for every day.
          </h2>
        </section>
      </main>

      
    </div>
  );
};

export default Home;