
const Home = () => {
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