import styles from './Wings.module.css';

export default function MentorWing({ onClose, isVisible, style = {} }) {
  const wingClasses = `
    ${styles.wingContainer} 
    ${styles.mentorWing}
    ${isVisible ? styles.visible : ''}
  `;

  return (
    <div className={wingClasses} style={style}>
      <button onClick={onClose} className={styles.closeButton} title="Close Mentor">×</button>
      <h2>The Mentor</h2>
      <p>Editorial guidance will appear here.</p>
    </div>
  );
}