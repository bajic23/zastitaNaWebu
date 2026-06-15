# WebAuthn/passkey dodatak

## Sta je WebAuthn/passkey

WebAuthn je standard za autentifikaciju bez deljenja lozinke sa serverom. Passkey je credential koji cuva korisnikov uredjaj, telefon, biometrici sistem, PIN ili sigurnosni kljuc. Server ne cuva tajnu, vec javni kljuc credentiala.

## Registracija credentiala

Ulogovani korisnik u profilu pokrece registraciju passkey-ja. Backend generise kriptografski challenge preko `@simplewebauthn/server`, vezuje ga za korisnika i cuva ga kratko vreme. Browser zatim poziva `navigator.credentials.create`, authenticator pravi novi par kljuceva, a frontend salje registration response nazad serveru.

Server proverava challenge, origin i RP ID. Ako je odgovor validan, u `User` dokument se cuvaju credential ID, javni kljuc, counter, device type, backup status i transports. Recovery kodovi se prikazuju korisniku samo jednom, a u bazi se cuvaju samo hash vrednosti.

## Login pomocu passkey-ja

Korisnik na login strani unese email i klikne passkey prijavu. Backend generise authentication challenge za credentiale tog korisnika. Browser poziva `navigator.credentials.get`, korisnik potvrdi identitet biometrijom, PIN-om, telefonom ili sigurnosnim kljucem, a frontend salje assertion serveru.

Server pronalazi credential ID, proverava potpis javnim kljucem, challenge, origin, RP ID i counter. Posle uspesne provere koristi isti postojeci login tok kao password login: izdaje JWT u HTTP-only cookie i refresh token. Ako je MFA ukljucen, WebAuthn login prvo vraca postojeci MFA challenge i korisnik nastavlja kroz `/verify-otp`.

## Recovery mehanizam

Posle aktivacije passkey-ja korisnik dobija recovery kodove. Ako izgubi uredjaj, na login strani moze da unese email i recovery kod. Backend hashira uneti kod i poredi ga sa hash vrednostima u bazi. Ako je kod validan, passkey credentiali i recovery kodovi se uklanjaju, cime se passkey deaktivira. Ako korisnik ima MFA, recovery se zavrsava kroz postojeci MFA tok.

## Bezbednosne prednosti

Passkey ne salje lozinku serveru i otporan je na phishing jer je credential vezan za RP ID i origin. Napadac ne moze da iskoristi passkey na drugom domenu. Privatni kljuc ostaje na korisnikovom uredjaju ili u sigurnom passkey provider-u, dok server cuva samo javni kljuc. Challenge je jednokratan i vremenski ogranicen, pa replay napadi ne bi trebalo da uspeju.

## Bitni endpoint-i

- `POST /api/auth/webauthn/register/options`
- `POST /api/auth/webauthn/register/verify`
- `POST /api/auth/webauthn/login/options`
- `POST /api/auth/webauthn/login/verify`
- `POST /api/auth/webauthn/recovery`
