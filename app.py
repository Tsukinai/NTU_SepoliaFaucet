import os
from flask import Flask, render_template, request, jsonify, session, make_response
from flask_mail import Mail, Message
from web3 import Web3, Account
import random
import string
import re
import logging
import time
import hashlib

# 从 .env 文件中加载环境变量，本地环境用的
import dotenv
dotenv.load_dotenv("faucet.env")

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

# 加载私钥
private_key = os.environ.get('PRIVATE_KEY')
if not private_key:
    raise ValueError("No PRIVATE_KEY set for Flask application")

# 配置邮件服务器
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

mail = Mail(app)

# 从环境变量中读取 INFURA_PROJECT_ID
infura_project_id = os.environ.get('INFURA_PROJECT_ID')
if not infura_project_id:
    raise ValueError("No INFURA_PROJECT_ID set for Flask application")

# 连接到以太坊节点
w3 = Web3(Web3.HTTPProvider(f'https://sepolia.infura.io/v3/{infura_project_id}'))
# 检查连接状态
if w3.is_connected():
    print("成功连接到以太坊节点")
else:
    print("未能连接到以太坊节点")
# 合约地址和ABI
contract_address = '0x2f6Ff8BF57b6819C29aE6151660c61E94Cd12432'
contract_abi = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"donate","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"_userAddress","type":"address"},{"internalType":"bytes32","name":"_userEmail","type":"bytes32"}],"name":"drip","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"dripAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getFaucetBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_userEmail","type":"bytes32"}],"name":"getRemainingWaitTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"interval","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"isVerified","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"lastDripTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ownerInterval","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_newAmount","type":"uint256"}],"name":"setDripAmount","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_userEmail","type":"bytes32"}],"name":"verifyUser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]

# 加载合约
contract = w3.eth.contract(address=contract_address, abi=contract_abi)

# 生成随机验证码
def generate_verification_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# 将验证码哈希成 SHA-256
def hash_code(code):
    return hashlib.sha256(code.encode()).hexdigest()

def email_to_hex(email):
    # 使用 keccak 方法生成哈希值
    email_hash = Web3.keccak(text=email)

    return email_hash

@app.route('/',methods=["get","post"])
def index():
    return render_template('index.html')
@app.route('/get_balance', methods=['GET'])
def get_balance():
    try:
        balance = contract.functions.getFaucetBalance().call()
        balance_in_ether = balance/(10 ** 18)
        return jsonify({'balance': balance_in_ether})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/drip', methods=['POST'])
def drip():
    try:
        user_address = request.json.get('user_address')
        wallet_address = os.environ.get("WALLET_ADDRESS")
        # 将用户地址转换为校验和地址
        checksum_address = Web3.to_checksum_address(user_address)
        # 构建交易，调用合约的 drip 方法，并传递 user_address
        email = session.get('email')  # 从请求中获取用户的邮箱\
        email_hash = email_to_hex(email)

        # 获取当前的 gasPrice 和 nonce
        gas_price = w3.eth.gas_price * 1.2
        nonce = w3.eth.get_transaction_count(wallet_address)

        # 构建交易
        tx = contract.functions.drip(checksum_address, bytes(email_hash)).build_transaction({
            'from': wallet_address,
            'nonce': nonce,
            'gas': 2000000,
            'gasPrice':  int(gas_price)
        })

        # 签名交易
        signed_tx = Account.sign_transaction(tx, private_key=private_key)

        # 发送交易
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        print(f"交易哈希: {tx_hash.hex()}")
        return jsonify({'message': 'Drip sent!', 'transaction_hash': tx_hash.hex()})
    except Exception as e:
        print(f"drip error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/check_wait_time', methods=['GET'])
def check_wait_time():
    try:
        email = session.get('email', None)  # 从请求中获取用户的邮箱
        if email is None:
            return jsonify({'error': 'No email provided'}), 500
        # 将邮箱哈希成 bytes32
        email_hash = email_to_hex(email)
        wait_time = contract.functions.getRemainingWaitTime(bytes(email_hash)).call()
        wait_time_in_minutes = (wait_time // 60) + (1 if wait_time % 60 else 0)
        return jsonify({'wait_time': wait_time_in_minutes})
    except Exception as e:
        print(f"check_wait_time error: {str(e)}")
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
            return jsonify({'message': f"Please wait {int(remaining_time)} seconds before requesting another code", 'remaining_time': remaining_time}), 429
    
    verification_code = generate_verification_code()
    # 将验证码哈希成 SHA-256
    session['verification_code'] = hash_code(verification_code)
    # 将邮箱保存到 session 中,命名与email不同，避免与另一个验证后的email变量冲突
    session['to_be_verified_email'] = email

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
    email = request.json.get('email')
    to_be_verified_email = session.get('to_be_verified_email')  # 从请求中获取用户的邮箱
    wallet_address = os.environ.get("WALLET_ADDRESS")

    # 检查验证码是否正确
    if hash_code(code) == session.get('verification_code') and email == to_be_verified_email:
        try:
            # 验证成功，删除验证码
            session.pop('verification_code')
            # 将邮箱哈希成 bytes32
            email_hash = email_to_hex(email)

            # 获取当前的 gasPrice 和 nonce
            gas_price = w3.eth.gas_price * 1.3
            nonce = w3.eth.get_transaction_count(wallet_address)

            # 调用智能合约的 verifyUser 函数， 目前有问题，需要修改
            tx = contract.functions.verifyUser(bytes(email_hash)).build_transaction({
                'from': wallet_address,
                'nonce': nonce,
                'gas': 2000000,
                'gasPrice': int(gas_price)
            })
            # 签名并发送交易
            signed_tx = Account.sign_transaction(tx, private_key=private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            print(f'Transaction hash: {tx_hash.hex()}')
            # 等待交易确认
            while True:
                try:
                    receipt = w3.eth.get_transaction_receipt(tx_hash)
                    if receipt is not None:
                        break
                except:
                    pass
                time.sleep(1)  # 等待一秒钟后重试

            # 检查交易是否成功
            if receipt['status'] == 1:
                # 交易成功，将 email 存入 cookie 并设置用户登录状态
                response = make_response(jsonify({'message': 'Verification successful', 'transaction_hash': tx_hash.hex()}))
                session['email'] = email
            else:
                # 交易失败
                response = jsonify({'message': 'Transaction failed', 'transaction_hash': tx_hash.hex()})
            return response
        except Exception as e:
            logging.error(f"Error verifying user: {e}")
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'message': 'Invalid verification code'}), 400

@app.route('/get_session')
def get_session():
    # 将 session 对象中的数据转换为一个标准的字典
    session_data = {key: session[key] for key in session}
    # 返回包含 session 数据的 JSON 响应
    return jsonify({'session': session_data})

if __name__=='__main__':
    app.run()