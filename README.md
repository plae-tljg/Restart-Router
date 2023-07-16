1. Validate Username & Password
2. Get Scram `var scram = CryptoJS.SCRAM()`
3. Get Nonce `var nonce = scram.nonce().toStirng()`
4. Generate Object as

		{
		"username": "user",
		"firstnonce": "907d17c38a572792d1f36f971cc3048e41c67f196848486a4edcaece8d00cf57",
		"mode": "1" //RSA_LOGIN_MODE = 1
		}
5. Convert above object into XML. Inputs are `'request'` and above object. Result will be,

		<?xml version="1.0" encoding="UTF-8"?>
		<request>
		<username>user</username>
		<firstnonce>907d17c38a572792d1f36f971cc3048e41c67f196848486a4edcaece8d00cf57</firstnonce>
		<mode>1</mode>
		</request>
	It will act as the **Body** for the `/api/user/challenge_login` POST request. 
6. Send a **GET** request to `http://192.168.8.1` to get the **CSRF Verification Tokens**. Which will be on `<meta name="csrf_token" content="TOKEN_HERE"/>` tags.  They are stored in `g_requestVerificationToken` variable. That is extracted and stored on that global variable using `getAjaxToken()` method. <sub><sup>There is also another way to get that token by sending a req to `/api/webserver/token` But that didn't work. Maybe I did something wrong. However I got a way to get those two tokens.</sup></sub> That token will be used as a header ( called `__RequestVerificationToken` ) to send the next request
7. Send a POST request to `http://192.168.8.1/api/user/challenge_login` An example,

		__RequestVerificationToken:O+E48sSn5Iv/fF6h/Oq8xyt45qfC8bqc
		Cookie: SessionID=WbYm0d/Q0CtukdNeqo4KqUiP6zsaL4uwIwKPhJS1SFplMNzdey6VxYA+C0RPBchhHbmvzL/TNap58OdxIh6bXqfZNIyFFBtF29g0JKy/X+oZpCegwbvscLimbeus3eTl

	And our response should look like so, **Also response header should also contain `__RequestVerificationToken` value, this will be needed in the next request that is to be sent**

		<?xml version="1.0" encoding="UTF-8"?>
		<response>
			<salt>735933444f7161574d4449615554486c5a5944686b414b30316f347734324c00</salt>
			<iterations>100</iterations>
			<servernonce>20d5164d1d538b0192c7da5df2fa36d699c9bc864f1a3894f5e2717f6bf3535cO69aaO0QwVPoWHYCemCAG6f31yqoe6E9</servernonce>
			<modeselected>1</modeselected>
		</response>

	If however, It looked something like this, 

		<?xml version="1.0" encoding="UTF-8"?>
		<error>
			<code>125003</code>
			<message></message>
		</error>

	that's obviously an error. And the relevant error code meaning can be found on the `main.js`

8. Then that response will be converted into a js object, which will look like this,

		{
			response : {
				iterations: "",
				modeselected: "1",
				salt: "20d5164d1d538b0192c7da5df2fa36d699c9bc864f1a3894f5e2717f6bf3535cO69aaO0QwVPoWHYCemCAG6f31yqoe6E9",
				servernonce: "20d5164d1d538b0192c7da5df2fa36d699c9bc864f1a3894f5e2717f6bf3535cO69aaO0QwVPoWHYCemCAG6f31yqoe6E9"
			}
			type: "response"
		}
9. Let's take above object into `ret` variable. Then following are created,

		var g_scarm_salt = CryptoJS.enc.Hex.parse(salt);
		var iter = ret.response.iterations;
		var finalNonce = ret.response.servernonce;
		var authMsg = firstNonce + ',' + finalNonce + ',' + finalNonce;
		var saltPassword = scram.saltedPassword(PASSWORD_HERE, g_scarm_salt, iter).toString();
		var clientKey = scram.clientKey(CryptoJS.enc.Hex.parse(saltPassword)).toString();
		var serverKey = scram.serverKey(CryptoJS.enc.Hex.parse(saltPassword)).toString();
		var clientProof = scram.clientProof(psd, g_scarm_salt, iter, authMsg).toString(); 
		 
		var finalPostData = {
            clientproof: clientProof,
            finalnonce: finalNonce
        };
		
10. Then that `finalPostData` is converted into `xml` and it will be the **BODY** for the next **POST** request to `http://192.168.8.1/api/user/authentication_login`. Converted xml will be like,

		<?xml version="1.0" encoding="UTF-8"?>
		<request>
			<clientproof>33687248cd519c489bf3d913aa612c8576571e4388fa03e21b3ba7ed4758a5b0</clientproof>
			<finalnonce>4b8ac0636fb2b5de716811dcf4d9836f7310f4aa442e364888a403b320d4981dAwNZ0RoBF0qY37e34lTCFKn5nZ00K92M</finalnonce>
		</request>
11. Next the headers for that request, `__RequestVerificationToken` for this request will be the **response** `__RequestVerificationToken` header value of the previous request. i.e. **Response** for the **POST** `http://192.168.8.1/api/user/challenge_login` request's header contains another `__RequestVerificationToken` value. That value should be the `__RequestVerificationToken` header value for the next **POST** request to `http://192.168.8.1/api/user/authentication_login` 
So, the headers for this **POST** request will be like this,

		__RequestVerificationToken:KR6+2PBV10yNdP5IA611ZKDOW4MzoqyA
		Cookie: SessionID=WbYm0d/Q0CtukdNeqo4KqUiP6zsaL4uwIwKPhJS1SFplMNzdey6VxYA+C0RPBchhHbmvzL/TNap58OdxIh6bXqfZNIyFFBtF29g0JKy/X+oZpCegwbvscLimbeus3eTl

	And the **BODY** for this request should look like this (same as above),

		<?xml  version="1.0"  encoding="UTF-8"?>
		<request>
			<clientproof>e884b66c58f5316caeb5e793158304c6bfbfc27a6e5acf4090f75375758242b2</clientproof>
			<finalnonce>20d5164d1d538b0192c7da5df2fa36d699c9bc864f1a3894f5e2717f6bf3535cf9fFXD7MwlaW0pSaIt2GgESyvcb0hUfG</finalnonce>
		</request>
	And the **RESPONSE** should look like this,

		<?xml version="1.0" encoding="UTF-8"?>
		<response
			<serversignature>aa43d51492d5bfc8348805268f2d3bd006a16fba11d3b1b203de6a5bda757890</serversignature
			<rsapubkeysignature>169c7a9456869ca367b52f174e0a40351dc271a7e1d6556244d26684c240621e</rsapubkeysignature
			<rsan>e114cc6295f232d5435668c56de580cf66feda76f7f112824e3bd7990d442c2b741d703069b7a260e815fb9f2afb95c49a655a2e16ccb31e8ad21ba9cdabd0172e056e1c40629023cd92a432ede12636819d24e245289e8e94ef98bc618dcf1b17e3362f1b54d4176539309d2bc760615533d37c15f505ae0781db9e933c60ccba672e5e6fd4fa0a2c3038524aa0907c53e1ed0d0c7fe3d9da01a914fd0d5dfd469f4f4f961806649390895d42c7ae001ad1afb0ad79a2b7f3ec65a4768e56858f5bf44771c2755a9cf5ea58145fdc7774b5c2ca35d5d759f891a40a6b06096a1c63cb9bda01ef5a8e76e1746826ed2b61321c7574996aa1fa4e5ac32b39cf61</rsan>
			<rsae>010001</rsae>
		</response>

12. Then that `xml` is converted into a object (let's take it as `ret`) and some verifications are done. These are confirmations. They are,

		var serverProof = scram.serverProof(psd, g_scarm_salt, iter, authMsg).toString();
		if (ret.response.serversignature == serverProof) {
			var publicKey = ret.response.rsan;
			var publicKeySignature = scram.signature(
                    CryptoJS.enc.Hex.parse(publicKey),
                    CryptoJS.enc.Hex.parse(serverKey)
                  ).toString();
            if (ret.response.rsapubkeysignature == publicKeySignature) {
				g_encPublickey.e = ret.response.rsae;
                g_encPublickey.n = ret.response.rsan;
			}
		}	
13. There is also another **GET** request to `http://192.168.8.1/api/user/state-login` that is to check whether we are logged in or not.
	It's response can take form like below,

		<?xml version="1.0" encoding="UTF-8"?>
		<response>
			<State>-1</State>
			<Username></Username>
			<password_type>4</password_type>
			<firstlogin>1</firstlogin>
			<extern_password_type>1</extern_password_type>
			<user_extern_password_type>1</user_extern_password_type>
			<accounts_number>2</accounts_number>
		</response>

	Or like below,

		<?xml version="1.0" encoding="UTF-8"?>
		<response>
			<State>0</State>
			<Username>user</Username>
			<password_type>4</password_type>
			<firstlogin>1</firstlogin>
			<extern_password_type>1</extern_password_type>
			<user_extern_password_type>1</user_extern_password_type>
			<accounts_number>2</accounts_number>
		</response>
	As you can see, the second response looks like that of a authenticated request. Because it contains `user` as the `<Username/>` value and the `state` is `0`. Also, when logged into the router all the requests that made to that endpoint looks like that, and when not logged in, all the responses made to that endpoint looks like the first one.

14. Then to restart the Router, we will have to send a POST request to `http://192.168.8.1/api/device/control` and attach Cookie and a new CSRF Token in that requset. To get those two, we need to send a request to `http://192.168.8.1/html/reboot.html` and get the Cookie and the CSRF token as previously. i.e. This **GET** request will contain a **Set-Cookie** header which contains the cookie and the **meta** tag contains the CSRF token.
    
15. To restart the router, a **POST** request is sent to `http://192.168.8.1/api/device/control`, 

		__RequestVerificationToken:KR6+2PBV10yNdP5IA611ZKDOW4MzoqyA
		Cookie: SessionID=WbYm0d/Q0CtukdNeqo4KqUiP6zsaL4uwIwKPhJS1SFplMNzdey6VxYA+C0RPBchhHbmvzL/TNap58OdxIh6bXqfZNIyFFBtF29g0JKy/X+oZpCegwbvscLimbeus3eTl

	And body as,


		<?xml version="1.0" encoding="UTF-8"?>
		<request>
			<Control>1</Control>
		</request>