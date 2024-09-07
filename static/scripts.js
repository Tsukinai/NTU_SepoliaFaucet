const contractAddress = '0x6c811d15930E0Eee492310475ba6992F068Eb627';
const contractABI = [
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
                "internalType": "address payable",
                "name": "recipient",
                "type": "address"
            }
        ],
        "name": "drip",
        "outputs": [],
        "stateMutability": "nonpayable",
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
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
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
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "getBalance",
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
        "inputs": [],
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
                "internalType": "address",
                "name": "",
                "type": "address"
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
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "lastLoginTime",
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
        "inputs": [],
        "name": "recordLogin",
        "outputs": [],
        "stateMutability": "view",
        "type": "function"
    }
]
// Initialize Web3
if (typeof window.ethereum !== 'undefined') {
    const web3 = new Web3(window.ethereum);
    ethereum.request({ method: 'eth_requestAccounts' });

    const contract = new web3.eth.Contract(contractABI, contractAddress);

    document.getElementById('getBalance').onclick = async () => {
        try {
            const balance = await contract.methods.getFaucetBalance().call();
            document.getElementById('result').innerText = `Faucet Balance: ${web3.utils.fromWei(balance, 'ether')} ETH`;
            animateResult();
        } catch (error) {
            console.error(error);
        }
    };

    document.getElementById('drip').onclick = async () => {
        try {
            const recip = recipAddress.value;
            if (!web3.utils.isAddress(recip)){
                document.getElementById('result').innerText = 'Invalid Address!';
                return;
            }

            const accounts = await web3.eth.getAccounts();
          
            await contract.methods.drip(recip).send({from: accounts[0]});
     
            document.getElementById('result').innerText = 'Drip successful!';
            animateResult();
        } catch (error) {
            console.error(error);
        }
    };

    document.getElementById('inquire').onclick = async () => {
        try {
            const accounts = await web3.eth.getAccounts();
            
            const res = await contract.methods.getBalance(accounts[0]).call();
            
            document.getElementById('result').innerText = `User Balance: ${web3.utils.fromWei(res, 'ether')} ETH`;
            animateResult();
        }catch (error) {
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

    document.getElementById('checkWaitTime').onclick = async () => {
        try {
            const waitTime = await contract.methods.getRemainingWaitTime().call();
            // Ensure waitTime is treated as a number for calculation
            const waitTimeInMinutes = Math.ceil(Number(waitTime) / 60);
            document.getElementById('waitTimeText').innerText = `${waitTimeInMinutes}m`;
            setProgress(waitTimeInMinutes, 60);
            document.getElementById('result').innerText = `Remaining wait time: ${waitTimeInMinutes} minutes`;
            animateResult();
        } catch (error) {
            console.error(error);
        }
    };


    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
    });

    // Animation for result text
    function animateResult() {
        gsap.from("#result", {
            y: 20,
            opacity: 0,
            duration: 0.5,
            ease: "power2.out"
        });
    }

    // Background animation
    gsap.to("body", {
        backgroundPosition: "100% 100%",
        duration: 20,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
    });

    // Progress ring animation
    function setProgress(current, max) {
        const circle = document.querySelector('.progress-ring__circle');
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        const offset = circumference - (current / max) * circumference;
        circle.style.strokeDashoffset = offset;
    }
}
