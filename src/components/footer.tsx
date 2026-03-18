export function Footer() {
  return (
    <div className="admin-container">
      <p id="admin-head">つくった人</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/self.png" id="self-img" width="60" alt="" />
      <p id="admin-comment">プログラミング初学者が</p>
      <p id="admin-comment">庭いじりの風情でやっております</p>
      <div className="admin-link-box">
        <a
          href="https://github.com/kazuyamano/ken-on-kun"
          rel="nofollow"
          target="_blank"
        >
          <button className="link-btn-angular" id="github-btn">
            <i className="fab fa-github"></i>
          </button>
        </a>
        <a
          href="https://twitter.com/kazuyamano"
          rel="nofollow"
          target="_blank"
        >
          <button className="link-btn-angular" id="twitter-btn2">
            <i className="fab fa-twitter"></i>
          </button>
        </a>
        <a href="https://note.com/kazuyamano" rel="nofollow" target="_blank">
          <button className="link-btn-angular" id="note-btn">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/note-logo.png" width="24" alt="note" />
          </button>
        </a>
      </div>
    </div>
  );
}
