document.getElementById('getBalance').onclick = async () => {
    try {
        const response = await fetch('/get_balance');
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        document.getElementById('result').innerText = `Faucet Balance: ${result.balance} ETH`;
        animateResult();
    } catch (error) {
        console.error(error);
    }
};

document.getElementById('drip').onclick = async () => {
    try {
        const userAddress = await getUserAddress();
        const response = await fetch('/drip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_address: userAddress })
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        document.getElementById('result').innerText = 'Drip successful!';
        animateResult();
    } catch (error) {
        console.error(error);
    }
};

document.getElementById('donate').onclick = async () => {
    try {
        const userAddress = await getUserAddress();
        const amount = document.getElementById('amount').value;
        const response = await fetch('/donate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_address: userAddress, amount: amount })
        });
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        document.getElementById('result').innerText = 'Donation successful!';
        animateResult();
    } catch (error) {
        console.error(error);
    }
};

document.getElementById('checkWaitTime').onclick = async () => {
    try {
        const response = await fetch('/check_wait_time');
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
        const waitTimeInMinutes = result.wait_time;
        document.getElementById('waitTimeText').innerText = `${waitTimeInMinutes}m`;
        setProgress(waitTimeInMinutes, 60);
        document.getElementById('result').innerText = `Remaining wait time: ${waitTimeInMinutes} minutes`;
        animateResult();
    } catch (error) {
        console.error(error);
    }
};

// 获取用户地址
async function getUserAddress() {
    if (typeof window.ethereum !== 'undefined') {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        return accounts[0];
    } else {
        throw new Error('Ethereum wallet is not connected');
    }
}

// 动画效果
function animateResult() {
    gsap.from("#result", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out"
    });
}

// 背景动画
gsap.to("body", {
    backgroundPosition: "100% 100%",
    duration: 20,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
});

// 进度环动画
function setProgress(current, max) {
    const circle = document.querySelector('.progress-ring__circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (current / max) * circumference;
    circle.style.strokeDashoffset = offset;
}

/**
 * Sends a verification code to the specified email address.
 * @async
 * @function sendVerificationCode
 * @returns {Promise<void>} A promise that resolves when the verification code is sent successfully.
 */
document.getElementById('sendVerificationCode').onclick = async () =>{
    const email = document.getElementById('email').value;
    const response = await fetch('/send_verification_code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    });
    const result = await response.json();
    alert(result.message);
}

document.getElementById('verifyCode').onclick = async () =>{
    const code = document.getElementById('verification_code').value;
    const response = await fetch('/verify_code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
    });
    const result = await response.json();
    alert(result.message);
}