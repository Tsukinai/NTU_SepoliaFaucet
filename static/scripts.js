let web3;
let userAddress;
// Initialize Web3
if (typeof window.ethereum !== 'undefined') {
    const web3 = new Web3(window.ethereum);
    // ethereum.request({ method: 'eth_requestAccounts' });

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

    // 检查等待时间
    document.getElementById('checkWaitTime').onclick = async () => {
        try {
            const response = await fetch('/check_wait_time', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json(); // 解析响应为 JSON
            const waitTimeInMinutes = result.wait_time;
            // debug
            // const waitTimeInMinutes = 599;
            document.getElementById('waitTimeText').innerText = `${waitTimeInMinutes}m`;
            setProgress(waitTimeInMinutes, 600);
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

    document.getElementById('inquire').onclick = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                const web3 = new Web3(window.ethereum);

                // 获取当前账户
                const accounts = await web3.eth.getAccounts();
                const account = accounts[0];

                // 获取余额
                const balance = await web3.eth.getBalance(account);

                // 将余额从Wei转换为Ether
                const balanceInEther = web3.utils.fromWei(balance, 'ether');

                document.getElementById('result').innerText = `Your Balance: ${balanceInEther} ETH`;
                animateResult();
            } catch (error) {
                console.error("User denied account access", error);
            }
        } else {
            console.error("MetaMask not installed");
        }
    }

    document.getElementById('verifyCode').onclick = async () =>{
        const verifyCode = document.getElementById('verification_code').value;
        const userAddress = document.getElementById('recipAddress').value;
        const response = await fetch('/verify_code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: verifyCode, user_address: userAddress })
        });
        const result = await response.json();
        if (result['code'] === 200) {
            const overlay = document.getElementById('overlay');
            const mainContent = document.getElementById('mainContent');
            overlay.style.display = 'none';  // 隐藏模糊遮罩和验证码组件
            mainContent.style.display = 'block';  // 显示主要内容
        }
        else {
            alert(result.message);
        }
    }
}
