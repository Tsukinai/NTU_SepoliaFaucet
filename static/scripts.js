let web3;
let userAddress;
// Initialize Web3
if (typeof window.ethereum !== 'undefined') {
    const web3 = new Web3(window.ethereum);
    ethereum.request({ method: 'eth_requestAccounts' });
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
            const accounts = await web3.eth.getAccounts();
            const amount = document.getElementById('amount').value;
            await contract.methods.donate().send({ from: accounts[0], value: web3.utils.toWei(amount, 'ether') });
            document.getElementById('result').innerText = 'Donation successful!';
            animateResult();
        } catch (error) {
            console.error(error);
        }
    };

    // 检查等待时间，要修改，需要传入邮箱地址
    document.getElementById('checkWaitTime').onclick = async () => {
        try {
            const walletAddress = document.getElementById('recipAddress').value;
            const response = await fetch('/check_wait_time', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ wallet_address: walletAddress })
            });
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
    document.getElementById('sendVerificationCode').onclick = async () => {
        const email = document.getElementById('email').value;
        try {
            const response = await fetch('/send_verification_code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email })
            });
    
            // 检查响应的 Content-Type
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/json')) {
                const result = await response.json();
                alert(result.message);
            } else {
                const text = await response.text();
                console.error('Unexpected response:', text);
                alert('Unexpected response from server. Check console for details.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Check console for details.');
        }
    }

    document.getElementById('verifyCode').onclick = async () =>{
        const verifyCode = document.getElementById('verification_code').value;
        const walletAddress = document.getElementById('recipAddress').value;
        const response = await fetch('/verify_code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: verifyCode, wallet_address: walletAddress })
        });
        const result = await response.json();
        alert(result.message);
    }
}