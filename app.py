import os
from flask import Flask, render_template, request, jsonify, session, make_response
from flask_mail import Mail, Message
from web3 import Web3
import random
import string
import re
import logging
import time
import hashlib

# 合理的邮箱后缀列表
valid_domains = [
    '@e.ntu.edu.sg',
    '@staff.main.ntu.edu.sg',
    '@student.main.ntu.edu.sg',
    '@assoc.main.ntu.edu.sg',
    '@niestaff.cluster.nie.edu.sg',
    '@niestudent.cluster.nie.edu.sg'
]

# 构建正则表达式模式
pattern = re.compile(r'^[^@]+@(?:e\.ntu\.edu\.sg|staff\.main\.ntu\.edu\.sg|student\.main\.ntu\.edu\.sg|assoc\.main\.ntu\.edu\.sg|niestaff\.cluster\.nie\.edu\.sg|niestudent\.cluster\.nie\.edu\.sg)$')

app = Flask(__name__)
app.secret_key = 'random_secret_key'

# 从秘密文件夹中加载私钥
with open('/etc/secrets/privatekey.txt') as key_file:
    private_key = key_file.read().strip()

# 配置邮件服务器
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')

mail = Mail(app)

# 从环境变量中读取 INFURA_PROJECT_ID
infura_project_id = os.environ.get('INFURA_PROJECT_ID')
if not infura_project_id:
    raise ValueError("No INFURA_PROJECT_ID set for Flask application")

# 连接到以太坊节点
w3 = Web3(Web3.HTTPProvider(f'https://sepolia.infura.io/v3/{infura_project_id}'))

# 合约地址和ABI
contract_address = '0x90060a179Ab9CEb99E83f3Bb4Fc038006BB23cF8'
contract_abi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"donate","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"_userAddress","type":"address"},{"internalType":"bytes32","name":"_userEmail","type":"bytes32"}],"name":"drip","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"dripAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getFaucetBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_userEmail","type":"bytes32"}],"name":"getRemainingWaitTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"interval","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"isVerified","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"lastDripTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ownerInterval","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_newAmount","type":"uint256"}],"name":"setDripAmount","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_userEmail","type":"bytes32"}],"name":"verifyUser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]

# 加载合约
contract = w3.eth.contract(address=contract_address, abi=contract_abi)

# 生成随机验证码
def generate_verification_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# 将验证码哈希成 SHA-256
def hash_code(code):
    return hashlib.sha256(code.encode()).hexdigest()

# 将邮箱哈希成 bytes32
def hash_email(email):
    return w3.keccak(text=email)

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
        # 构建交易，调用合约的 drip 方法，并传递 user_address
        contract.methods.drip(user_address)
        return jsonify({'message': 'Drip successful!'})
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
    if not pattern.match(email):
        return jsonify({'message': 'Invalid email domain'}), 400
    
    # 检查上次发送验证码的时间
    last_sent_time = request.cookies.get('last_sent_time')
    current_time = time.time()
    if last_sent_time:
        remaining_time = 60 - (current_time - float(last_sent_time))
        if remaining_time > 0:
            # 返回 429 Too Many Requests 状态码
            return jsonify({'message': 'Please wait 60 seconds before requesting another code', 'remaining_time': remaining_time}), 429
    
    verification_code = generate_verification_code()
    # 将验证码哈希成 SHA-256
    session['verification_code'] = hash_code(verification_code)
    session['email'] = email

    # 发送邮件
    msg = Message('Your Verification Code', sender='ntu.faucet@yahoo.com', recipients=[email])
    msg.body = f'Your verification code is {verification_code}'
    msg.html = f'''
        <html>
            <body>
                <h1>Verification Code</h1>
                <p>Dear NTUer,</p>
                <p>Your verification code is:</p>
                <h2 style="color: #2e6c80;">{verification_code}</h2>
                <p>Please use this code to complete your verification process.</p>
                <p>Thank you!</p>
            </body>
        </html>
    '''
    mail.send(msg)

    # 设置 Cookie
    response = make_response(jsonify({'message': 'Verification code sent'}))
    response.set_cookie('last_sent_time', str(current_time), max_age=60)

    return response

@app.route('/verify_code', methods=["POST"])
def verify_code():
    code = request.json.get('code')
    user_address = request.json.get('user_address')  # 从请求中获取用户的以太坊地址
    email = request.json.get('email')  # 从请求中获取用户的邮箱

    if hash_code(code) == session.get('verification_code') & email == session.get('email'):
        try:
            # 将邮箱哈希成 bytes32
            email_hash = hash_email(email)

            # 调用智能合约的 verifyUser 函数
            tx = contract.functions.verifyUser(user_address, email_hash).buildTransaction({
                'from': os.environ.get('WALLET_ADDRESS'),
                'nonce': w3.eth.getTransactionCount(os.environ.get('WALLET_ADDRESS')),
                'gas': 2000000,
                'gasPrice': w3.toWei('50', 'gwei')
            })

            # 签名并发送交易
            signed_tx = w3.eth.account.signTransaction(tx, private_key=private_key)
            tx_hash = w3.eth.sendRawTransaction(signed_tx.rawTransaction)
            print(f'Transaction hash: {tx_hash.hex()}')

            return jsonify({'message': 'Verification successful'})
        except Exception as e:
            logging.error(f"Error verifying user: {e}")
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'message': 'Invalid verification code'}), 400
if __name__=='__main__':
    app.run()