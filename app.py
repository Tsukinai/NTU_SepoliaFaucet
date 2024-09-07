import os
from flask import Flask, render_template, request, jsonify, session
from flask_mail import Mail, Message
from web3 import Web3
import random
import string

app = Flask(__name__)
app.secret_key = 'random_secret_key'

# 配置邮件服务器
app.config['MAIL_SERVER'] = 'smtp.example.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'your_email@example.com'
app.config['MAIL_PASSWORD'] = 'your_password'

mail = Mail(app)

# 从环境变量中读取 INFURA_PROJECT_ID
infura_project_id = os.getenv('INFURA_PROJECT_ID')
if not infura_project_id:
    raise ValueError("No INFURA_PROJECT_ID set for Flask application")

# 连接到以太坊节点
w3 = Web3(Web3.HTTPProvider(f'https://sepolia.infura.io/v3/{infura_project_id}'))

# 合约地址和ABI
contract_address = '0xfc2B656ddF4543AA3A8F91D6C7322Ff3CC8A8B6D'
contract_abi = [
    {
        "inputs": [],
        "name": "donate",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
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
    }
]

# 加载合约
contract = w3.eth.contract(address=contract_address, abi=contract_abi)

# 从秘密文件夹中加载私钥
with open('/etc/secrets/privatekey.txt') as key_file:
    private_key = key_file.read().strip()

# 生成随机验证码
def generate_verification_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@app.route('/',methods=["get","post"])
def index():
    return render_template('index.html')
@app.route('/get_balance', methods=['GET'])
def get_balance():
    try:
        balance = contract.methods.getFaucetBalance().call()
        balance_in_ether = w3.fromWei(balance, 'ether')
        return jsonify({'balance': balance_in_ether})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/drip', methods=['POST'])
def drip():
    try:
        user_address = request.json.get('user_address')
        tx = contract.methods.drip().buildTransaction({
            'from': user_address,
            'nonce': w3.eth.getTransactionCount(user_address),
            'gas': 2000000,
            'gasPrice': w3.toWei('50', 'gwei')
        })
        signed_tx = w3.eth.account.signTransaction(tx, private_key=private_key)
        tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
        return jsonify({'message': 'Drip successful!', 'tx_hash': tx_hash.hex()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/donate', methods=['POST'])
def donate():
    try:
        user_address = request.json.get('user_address')
        amount = request.json.get('amount')
        tx = contract.methods.donate().buildTransaction({
            'from': user_address,
            'value': w3.toWei(amount, 'ether'),
            'nonce': w3.eth.getTransactionCount(user_address),
            'gas': 2000000,
            'gasPrice': w3.toWei('50', 'gwei')
        })
        signed_tx = w3.eth.account.signTransaction(tx, private_key=private_key)
        tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
        return jsonify({'message': 'Donation successful!', 'tx_hash': tx_hash.hex()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/check_wait_time', methods=['GET'])
def check_wait_time():
    try:
        wait_time = contract.methods.getRemainingWaitTime().call()
        wait_time_in_minutes = (wait_time // 60) + (1 if wait_time % 60 else 0)
        return jsonify({'wait_time': wait_time_in_minutes})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/send_verification_code', methods=["POST"])
def send_verification_code():
    email = request.json.get('email')
    if not email.endswith('@ntu.edu.sg'):
        return jsonify({'message': 'Invalid email domain'}), 400

    verification_code = generate_verification_code()
    session['verification_code'] = verification_code
    session['email'] = email

    msg = Message('Your Verification Code', sender='your_email@example.com', recipients=[email])
    msg.body = f'Your verification code is {verification_code}'
    mail.send(msg)

    return jsonify({'message': 'Verification code sent'})

@app.route('/verify_code', methods=["POST"])
def verify_code():
    code = request.json.get('code')
    user_address = request.json.get('user_address')  # 从请求中获取用户的以太坊地址

    if code == session.get('verification_code'):
        # 验证成功，标记用户为已验证
        session['is_verified'] = True

        # 调用智能合约的 verifyUser 函数
        tx = contract.functions.verifyUser(user_address).buildTransaction({
            'from': 'YOUR_WALLET_ADDRESS',
            'nonce': w3.eth.getTransactionCount('YOUR_WALLET_ADDRESS'),
            'gas': 2000000,
            'gasPrice': w3.toWei('50', 'gwei')
        })

        # 签名并发送交易
        signed_tx = w3.eth.account.signTransaction(tx, private_key=private_key)
        tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
        print(f'Transaction hash: {tx_hash.hex()}')

        return jsonify({'message': 'Verification successful'})
    else:
        return jsonify({'message': 'Invalid verification code'}), 400
if __name__=='__main__':
    app.run()