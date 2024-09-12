let web3;
let userAddress;

const contractAddress = '0x2f6Ff8BF57b6819C29aE6151660c61E94Cd12432';
const contractABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "donate",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_userAddress",
                "type": "address"
            },
            {
                "internalType": "bytes32",
                "name": "_userEmail",
                "type": "bytes32"
            }
        ],
        "name": "drip",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "dripAmount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getFaucetBalance",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "_userEmail",
                "type": "bytes32"
            }
        ],
        "name": "getRemainingWaitTime",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "interval",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "isVerified",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "lastDripTime",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "ownerInterval",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_newAmount",
                "type": "uint256"
            }
        ],
        "name": "setDripAmount",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "_userEmail",
                "type": "bytes32"
            }
        ],
        "name": "verifyUser",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_amount",
                "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "stateMutability": "payable",
        "type": "receive"
    }
]

// 需要调用 MetaMask 的部分
if (typeof window.ethereum !== 'undefined') {
    const web3 = new Web3(window.ethereum);
    const contract = new web3.eth.Contract(contractABI, contractAddress);

    // 捐款
    document.getElementById('donate').onclick = async () => {
        try {
            const accounts = await ethereum.request({method: 'eth_requestAccounts'});
            const amount = document.getElementById('amount').value;
            await contract.methods.donate().send({from: accounts[0], value: web3.utils.toWei(amount, 'ether')});
            document.getElementById('result').innerText = 'Donation successful!';
            animateResult();
        } catch (error) {
            console.error(error);
        }
    };

    // 获取用户地址余额
    document.getElementById('inquire').onclick = async () => {
        try {
            // 获取当前账户
            const accounts = await ethereum.request({method: 'eth_requestAccounts'});
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
    }
} else {
    console.error("MetaMask not installed");
}

// 获取余额
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

// 获取等待时间
document.getElementById('drip').onclick = async () => {
    try {
        const userAddress = document.getElementById('recipAddress').value;
        const response = await fetch('/drip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({user_address: userAddress})
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

// 发送验证码
document.getElementById('sendVerificationCode').onclick = async () => {
    const email = document.getElementById('email').value;
    try {
        const response = await fetch('/send_verification_code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({email: email})
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

// 验证用户
document.getElementById('verifyCode').onclick = async () => {
    const verifyCode = document.getElementById('verification_code').value;
    const userAddress = document.getElementById('recipAddress').value;
    const response = await fetch('/verify_code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({code: verifyCode, user_address: userAddress})
    });
    const result = await response.json();
    console.log(result)
    if (response.ok) {
        const overlay = document.getElementById('overlay');
        const mainContent = document.getElementById('mainContent');
        overlay.style.display = 'none';  // 隐藏模糊遮罩和验证码组件
        mainContent.style.display = 'block';  // 显示主要内容
    } else {
        alert(result.message);
    }
}

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
        const waitTimeInHours = Math.floor(result.wait_time / 60);
        const waitTimeInMinutes = result.wait_time % 60;

        // debug
        // const waitTimeInMinutes = 599;
        document.getElementById('waitTimeText').innerText = `${waitTimeInHours}h`;
        setProgress(result.wait_time, 1440);
        document.getElementById('result').innerText = `Remaining wait time: ${waitTimeInHours} hours ${waitTimeInMinutes} minutes `;
        animateResult();
    } catch (error) {
        console.error(error);
    }
};

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



