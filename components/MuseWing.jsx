import styles from './Wings.module.css';

export default function MuseWing({ onClose, isVisible, style = {} }) {
  const wingClasses = `
    ${styles.wingContainer} 
    ${styles.museWing}
    ${isVisible ? styles.visible : ''}
  `;

  return (
    <div className={wingClasses} style={style}>
      <button onClick={onClose} className={styles.closeButton} title="Close Muse">×</button>
      <h2>The Muse</h2>
      <p>Creative inspiration will appear here.</p>
    </div>
  );
}