async function handleCount() {
  const rawInput = document.getElementById("username").value.trim();
  if (!rawInput) return;

  const username = rawInput.startsWith("@") ? rawInput.slice(1).toLowerCase() : rawInput.toLowerCase();
  console.log("Sanitized Username:", username);

  // Check localStorage for saved x value
  const storedX = localStorage.getItem(`zkgm_x_${username}`);
  if (storedX) {
    console.log(`Loaded saved x from localStorage for ${username}:`, storedX);
    displayResult(username, parseInt(storedX));
    return;
  }

  try {
    const res = await fetch("top_2000_from_network.json");
    const data = await res.json(); // array
    console.log("Fetched entries:", data.length);

    const user = data.find(entry => entry.username.toLowerCase() === username);

    let mindshare;
    if (user && user.mindshare) {
      mindshare = parseFloat(user.mindshare.replace('%', ''));
      if (mindshare < 0.01) mindshare = 0.02;
      if (mindshare > 0.5) mindshare -= 0.15;
    } else {
      console.log("User not found — assigning default mindshare: 0.005");
      mindshare = 0.005;
    }

    const base = Math.floor((mindshare / 100) * 1039596);
    const random = Math.floor(Math.random() * 401) + 100;
    let x = base + random;
    if (x > 5000) x -= 1000;

    localStorage.setItem(`zkgm_x_${username}`, x.toString());
    console.log(`Generated and saved new x for ${username}:`, x);

    displayResult(username, x);

  } catch (error) {
    console.error("Error fetching or processing JSON:", error);
    alert("Something went wrong while fetching data.");
  }
}

function displayResult(username, x) {
  const roundedTarget = Math.ceil(x / 100) * 100;

  document.getElementById("count-display").innerText = `You have said ZKGM ${x} times!`;
  document.getElementById("description").innerText =
    `Congratulations 🎉, you have said ZKGM over ${x} times!\nNext target: ${roundedTarget}`;

  document.getElementById("input-box").style.display = "none";
  document.getElementById("result-box").style.display = "flex";

  triggerConfetti();

  const tweetText = encodeURIComponent(
    `Check this out guys!\nI have posted the word ZKGM ${x} times.\n\nTry it yourself 👉 union-zkgm.vercel.app \nhttps://x.com/Shinosuka_eth/status/1950238026799714779`
  );

  document.getElementById("tweet-button").onclick = () => {
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
  };
}

function triggerConfetti() {
  confetti({
    particleCount: 150,
    spread: 90,
    origin: { y: 0.6 },
  });
}
