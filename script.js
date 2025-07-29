async function handleCount() {
  const username = document.getElementById("username").value.trim();
  if (!username) return;

  try {
    const res = await fetch("top_2000_from_network.json");
    const data = await res.json();
    const user = data.find(u => u.Username.toLowerCase() === username.toLowerCase());

    let mindshare = user?.Mindshare ?? 0.02;
    if (mindshare < 0.01) mindshare = 0.02;
    if (mindshare > 0.5) mindshare -= 0.15;

    const base = Math.floor((mindshare / 100) * 1039596);
    const random = Math.floor(Math.random() * 401) + 100;
    let x = base + random;
    if (x > 5000) x -= 1000;

    const roundedTarget = Math.ceil(x / 100) * 100;

    document.getElementById("count-display").innerText = `You have said ZKGM ${x} times!`;
    document.getElementById("description").innerText = `Congratulations 🎉, you have said ZKGM over ${x} times!\nNext target: ${roundedTarget}`;

    document.getElementById("input-box").style.display = "none";
    document.getElementById("result-box").style.display = "flex";

    triggerConfetti();

    const tweetText = encodeURIComponent(
      `Check this out guys!\nI have posted the word ZKGM ${x} times.\n\nTry it yourself 👉 union-zkgm.vercel.app`
    );

    document.getElementById("tweet-button").onclick = () => {
      window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
    };

  } catch (error) {
    console.error("Failed to fetch or calculate:", error);
  }
}

function triggerConfetti() {
  confetti({
    particleCount: 150,
    spread: 90,
    origin: { y: 0.6 },
  });
}
