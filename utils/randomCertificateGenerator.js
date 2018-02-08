const fs = require('fs');
const faker = require('faker');
const crypto = require('crypto');
const {sha3} = require('ethereumjs-util');

// Generate receipient based on
// - Profile Identifier Properties in https://www.imsglobal.org/sites/default/files/Badges/OBv2p0/index.html#ProfileIdentifierProperties
// - DID extension describe in https://govtechsg.github.io/certificate-schema/schema/1.0/
function recipientDecorator(certificate){
  function emailProfile(){
    return {
      type: 'email',
      identity: faker.internet.email()
    };
  }
  function didProfile(){
    return {
      type: 'did',
      identity: `did:${faker.internet.domainWord()}:${faker.random.uuid()}`
    };
  }
  function urlProfile(){
    return {
      type: 'url',
      identity: faker.internet.url()
    };
  }
  function telephoneProfile(){
    return {
      type: 'telephone',
      identity: faker.phone.phoneNumber()
    };
  }

  // Randomly decide to hash identity based on https://github.com/mozilla/openbadges-backpack/wiki/How-to-hash-&-salt-in-various-languages.
  function randomHashingFunction(profile){
    if(Math.random() > 0.5){
      profile.hashed = false;
    }else{
      const salt = faker.random.alphaNumeric(10);
      const hash = crypto.createHash('sha256');
      hash.update(profile.identity + salt);

      profile.salt = salt;
      profile.identity = 'sha256$'+ hash.digest('hex');
      profile.hashed = true;
    }
    return profile;
  }

  let profiles = [];

  // Randomly add 1 to 4 profiles
  const seed = parseInt(Math.random()*15) + 1;
  if((seed & 1) == 1) profiles.push(randomHashingFunction(emailProfile()));
  if((seed & 2) == 2) profiles.push(randomHashingFunction(didProfile()));
  if((seed & 4) == 4) profiles.push(randomHashingFunction(urlProfile()));
  if((seed & 8) == 8) profiles.push(randomHashingFunction(telephoneProfile()));

  if(profiles.length == 1) profiles = profiles[0];

  certificate.receipient = profiles;
}

function certificateDecorator(certificate){
  function generateEvidence(){
    // 80% will have visible evidences
    if(Math.random() < 0.8){
      let transcript = [];
      for(let i=0; i<parseInt(Math.random()*50) + 1; i++){
        transcript.push({
          name: faker.random.alphaNumeric(10) + ':' + faker.random.alphaNumeric(15),
          grade: faker.random.alphaNumeric(10) + ':' + 'A+',
          courseCredit: faker.random.alphaNumeric(10) + ':' + '4.0',
          courseCode: faker.random.alphaNumeric(10) + ':' + faker.random.alphaNumeric(5)
        });
      }
      return {
        transcript,
      };
    }
  }

  function generatePrivateEvidence(){
    // 30% will have hidden evidences
    if(Math.random() < 0.3){
      let privateEvidence = [];
      for(let i=0; i<parseInt(Math.random()*50) + 1; i++){
        const plaintextEvidence = faker.random.alphaNumeric(10) + ':' + faker.random.alphaNumeric(15);
        const hashedEvidence = sha3(plaintextEvidence).toString('hex');
        privateEvidence.push(hashedEvidence);
      }
      return privateEvidence;
    }
  }

  certificate.badge.name = faker.random.alphaNumeric(25);
  certificate.badge.criteria = faker.random.alphaNumeric(80);

  const evidence = generateEvidence();
  if(evidence) certificate.badge.evidence = evidence;

  const privateEvidence = generatePrivateEvidence();
  if(privateEvidence) certificate.badge.privateEvidence = privateEvidence;
}

function randomCertificate () {
  let certificate = {
    id:'urn:uuid:'+faker.random.uuid(),
    type: 'Assertion',
    issuedOn: new Date().toISOString(),
    '@context': [
      'https://openbadgespec.org/v2/context.json',
      'https://govtechsg.github.io/certificate-schema/schema/1.0/context.json'
    ],
    badge:{
      type: 'BadgeClass',
      evidencePrivacyFilter: {
        type: 'SaltedProof',
        saltLength: '10'
      }
    },
    verification: {
      type: 'ETHStoreProof',
      contractAddress: '0x76bc9e61a1904b82cbf70d1fd9c0f8a120483bbb'
    }
  };

  recipientDecorator(certificate);
  certificateDecorator(certificate);

  return certificate;
}

function generateRandomCertificate(num, dir){
  for (let i = 0; i < num; i++) {
    const cert = randomCertificate();
    const certId = cert.id;
    fs.writeFileSync(`${dir}/${certId}.json`, JSON.stringify(cert, null, 2));
  }

  return num;
}

module.exports = {
  generateRandomCertificate,
  randomCertificate,
};