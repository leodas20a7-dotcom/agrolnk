// AGRAMAZ Time-Aware Greeting Utility

/**
 * Returns dynamic, time-of-day greeting (morning, afternoon, evening, night)
 */
export function getTimeGreeting(userName = '') {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  let emoji = '👋';

  if (hour >= 5 && hour < 12) {
    greeting = 'Good morning';
    emoji = '👋';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
    emoji = '☀️';
  } else if (hour >= 17 && hour < 21) {
    greeting = 'Good evening';
    emoji = '🌆';
  } else {
    greeting = 'Good evening'; // or Good night
    emoji = '🌙';
  }

  return {
    greeting,
    emoji,
    fullGreeting: userName ? `${greeting}, ${userName}` : greeting,
  };
}
