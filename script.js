// Version 20

const firebaseConfig = {
    apiKey: "AIzaSyAlyTC44ZMeLmbmJzorOAwSl1eBNACPLwY",
    authDomain: "million-ad.firebaseapp.com",
    databaseURL: "https://million-ad-default-rtdb.firebaseio.com",
    projectId: "million-ad",
    storageBucket: "million-ad.appspot.com",
    messagingSenderId: "936175556027",
    appId: "1:936175556027:web:5ff34b4f5ebe7983e0609e",
    measurementId: "G-1VBJWW8PBR"
};

firebase.initializeApp(firebaseConfig);
firebase.analytics();


//variables to Change
const nOfEntriesSaved = 20;


const buttonOnce = document.getElementById("buttonDonate");
const PaymentOverlay = document.getElementById("paymentOverlay");
const PaymentClickField = document.getElementById("paymentClickField");
const reloadLB = document.getElementById("reloadLB");
const reloadText = document.getElementById("reloadText");

const donAmountField = document.getElementById("DonationAmount");
let donAmount = 0;
const lbNameField = document.getElementById("leaderboardName");
let lbName = "";
const nameLength = 13;
const cbEntrust = document.getElementById("cbEntrust");
const cbWithdraw = document.getElementById("cbWithdraw");
const SubmitPayButton = document.getElementById("SubmitPayButton");
const PayPalButton = document.getElementById("paypal-button-container");
const notCheckedError = document.getElementById("notCheckedError");
const notMinimum = document.getElementById("notMinimum");
let checkboxes = false;
let minimum = false;

const PaymentSuccessMessage = document.getElementById("PaymentSuccessMessage");
const PaymentSuccessMessageNoLB = document.getElementById("PaymentSuccessMessageNoLB");
const PaymentCancelMessage = document.getElementById("PaymentCancelMessage");
const PaymentErrorMessage = document.getElementById("PaymentErrorMessage");

const lbLatest = document.getElementById("lbLatest");
const lbAllTime = document.getElementById("lbAllTime");
const lbDonators = document.getElementById("lbDonators");

let arrLatest = [];
let arrAllTime = [];
let arrDonators = [];
let arrUser = [];

const db = firebase.database();
let lbMail = "";
let ppUserID = "";

let statsdonationsTotal = 0;
let statsNumOfDonations = 0;
let statsdonationsTotalAnon = 0;
let statsNumOfDonationsAnon = 0;

let updates = {};


paypal.Buttons({
    createOrder: function (data, actions) {
        donAmount = parseFloat(donAmountField.value);
        return actions.order.create({
            purchase_units: [{
                amount: {
                    value: donAmount.toString()
                }
            }]
        });
    },
    onApprove: function (data, actions) {
        return actions.order.capture().then(function (details) {
            lbName = lbNameField.value;
            lbMail = details.payer.email_address;
            PPuserID = details.payer.payer_id;
            firebaseLogin(lbName, donAmount, lbMail, PPuserID);
            donAmountField.value = "";
            lbNameField.value = "";
            PaymentOverlay.style.display = "none";
            if (lbName == "") {
                PaymentSuccessMessageNoLB.style.display = "flex";
            }
            else {
                PaymentSuccessMessage.style.display = "flex";
            }
        });
    },
    onCancel: function (data, actions) {
        console.log('Transaction canceled!');
        lbName = lbNameField.value;
        PaymentOverlay.style.display = "none";
        PaymentCancelMessage.style.display = "flex";
    },
    onError: function (err) {
        console.log('Transaction Error!');
        alert("Error Message: " + err);
        lbName = lbNameField.value;
        PaymentOverlay.style.display = "none";
        PaymentErrorMessage.style.display = "flex";
    }
}).render('#paypal-button-container');

function firebaseLogin(name, donation, mail, PPuserID) {
    let fbUser = "";
    firebase.auth().signInWithEmailAndPassword(mail, PPuserID)
        .then((userCredential) => {
            console.log("User signed in!");
            fbUser = userCredential.user.uid;
            changeFirebase(name, donation, mail, fbUser, PPuserID);
        })
        .catch((e) => {
            console.log("User doesn't exist!");
            firebase.auth().createUserWithEmailAndPassword(mail, PPuserID)
                .then((userCredential) => {
                    console.log("- Created new User and signed in");
                    fbUser = userCredential.user.uid;
                    changeFirebase(name, donation, mail, fbUser, PPuserID);
                })
                .catch((e) => {
                    alert(e);
                });
        });
}

function changeFirebase(name, donation, mail, userID, PPuserID) {
    let date = new Date();
    date = date.toUTCString();
    let addDonation = { amount: donation, date: date };
    let userData = [];
    let donatedTotal = 0;
    let lbID = 0;

    db.ref("users/" + userID).once("value").then((obj) => {
        if (obj.val() == null) {
            db.ref("uniqueID/lbID").once("value").then((obj) => {
                if (obj.val() == null) {
                    lbID = 1;
                }
                else {
                    lbID = obj.val();
                    lbID++;
                }
                userData = {
                    allDonations: { 0: addDonation },
                    donated: donation,
                    name: name,
                    mail: mail,
                    fbUserID: userID,
                    lbID: lbID,
                    PPuserID: PPuserID
                };
                donatedTotal = donation;
                updates["uniqueID/lbID"] = lbID;
                updates["statistics/Donators"] = lbID;
                updates["users/" + userID] = userData;
                changeLeaderboards(name, donation, donatedTotal, lbID);
            }, (e) => {
                alert(e);
            });
        }
        else {
            userData = obj.val();
            userData.donated = userData.donated + donation;
            userData.name = name;
            userData.allDonations.unshift(addDonation);
            donatedTotal = userData.donated;
            lbID = userData.lbID;
            updates["users/" + userID] = userData;
            changeLeaderboards(name, donation, donatedTotal, lbID);
        }
    }, (e) => {
        alert(e);
    });
}

function changeLeaderboards(name, donation, donatedTotal, lbID) {
    if (name != "") {
        console.log("Create Leaderboard Entry");
        db.ref("leaderBoard/latest").once("value").then((obj) => {
            arrLatest = obj.val();
            if (obj.val() == null) {
                arrLatest = [];
                arrLatest.unshift({ name: name, donation: donation });
            }
            else {
                arrLatest.unshift({ name: name, donation: donation });
                if (arrLatest.length > nOfEntriesSaved) {
                    arrLatest.pop();
                }
            }
            db.ref("leaderBoard/alltime").once("value").then((obj) => {
                arrAllTime = obj.val();
                if (obj.val() == null) {
                    arrAllTime = [];
                    arrAllTime.unshift({ name: name, donation: donation });
                }
                else {
                    arrAllTime.unshift({ name: name, donation: donation });
                    arrAllTime.sort(compareDonation);
                    if (arrAllTime.length > nOfEntriesSaved) {
                        arrAllTime.pop();
                    }
                }
                db.ref("leaderBoard/Donators").once("value").then((obj) => {
                    arrUser = {
                        lbID: lbID,
                        donated: donatedTotal,
                        name: name
                    };
                    let userInList = false;
                    arrDonators = obj.val();
                    if (obj.val() == null) {
                        arrDonators = [];
                        arrDonators.unshift(arrUser);
                    }
                    else {
                        for (let i = 0; i < arrDonators.length; i++) {
                            if (arrDonators[i].lbID == lbID) {
                                arrDonators[i].donated = arrUser.donated;
                                arrDonators[i].name = name;
                                userInList = true;
                            }
                            else {
                            }
                        }
                        if (userInList == false) {
                            arrDonators.unshift(arrUser);
                        }
                        else {
                            userInList = false;
                        }
                        arrDonators.sort(compareDonated);
                        if (arrDonators.length > nOfEntriesSaved) {
                            arrDonators.pop();
                        }
                    }
                    updates['leaderBoard/latest'] = arrLatest;
                    updates['leaderBoard/alltime'] = arrAllTime;
                    updates["leaderBoard/Donators"] = arrDonators;
                    changeInnerHTML();
                    changeStatistics(name, donation);
                }, (e) => {
                    alert(e);
                });
            }, (e) => {
                alert(e);
            });
        }, (e) => {
            alert(e);
        });
    }
    else {
        console.log("Anonymous Donation - Prevent Leaderboard Entry");
        changeStatistics(name, donation);
    }
}

function changeStatistics(name, donation) {
    db.ref("statistics").once("value").then((obj) => {
        let statisticsObj = obj.val();
        if (obj.val() == null) {
            statsdonationsTotal = donation;
            statsNumOfDonations = 1;
            if (name == "") {
                statsdonationsTotalAnon = donation;
                statsNumOfDonationsAnon = 1;
            }
        }
        else {
            statsdonationsTotal = statisticsObj.DonationsTotal;
            statsdonationsTotal = statsdonationsTotal + donation;

            statsNumOfDonations = statisticsObj.NumOfDonations;
            statsNumOfDonations++;

            statsdonationsTotalAnon = statisticsObj.DonationsTotalAnon;
            statsNumOfDonationsAnon = statisticsObj.NumOfDonationsAnon;
            if (name == "") {
                statsdonationsTotalAnon = statsdonationsTotalAnon + donation;
                statsNumOfDonationsAnon++;
            }
        }

        updates["statistics/NumOfDonations"] = statsNumOfDonations;
        updates["statistics/DonationsTotal"] = statsdonationsTotal;
        updates["statistics/NumOfDonationsAnon"] = statsNumOfDonationsAnon;
        updates["statistics/DonationsTotalAnon"] = statsdonationsTotalAnon;

        db.ref().update(updates);
        updates = {};

        firebase.auth().signOut().then(() => {
            console.log("User logged out!");
        }).catch((e) => {
            alert(e);
        });
    }, (e) => {
        alert(e);
    });
}

function compareDonation(a, b) {
    if (a.donation < b.donation) {
        return 1;
    }
    if (a.donation > b.donation) {
        return -1;
    }
    return 0;
}

function compareDonated(a, b) {
    if (a.donated < b.donated) {
        return 1;
    }
    if (a.donated > b.donated) {
        return -1;
    }
    return 0;
}

function loadLeaderboards() {
    db.ref("leaderBoard/latest").once("value").then((obj) => {
        if (obj.val() == null) {
            arrLatest = [];
        }
        else {
            arrLatest = [];
            arrLatest = obj.val();
        }
        db.ref("leaderBoard/alltime").once("value").then((obj) => {
            if (obj.val() == null) {
                arrAllTime = [];
            }
            else {
                arrAllTime = [];
                arrAllTime = obj.val();
            }
            db.ref("leaderBoard/Donators").once("value").then((obj) => {
                if (obj.val() == null) {
                    arrDonators = [];
                }
                else {
                    arrDonators = [];
                    arrDonators = obj.val();
                }
                changeInnerHTML();
            }, (err) => {
                alert(err);
            });
        }, (err) => {
            alert(err);
        });
    }, (err) => {
        alert(err);
    });


}

function changeInnerHTML() {
    let changeLatestNames = document.getElementsByClassName("lbnamelatest");
    let changeLatestDonations = document.getElementsByClassName("lbdonationlatest");

    for (let i = 0; i < arrLatest.length && i < changeLatestNames.length; i++) {
        changeLatestNames[i].innerHTML = arrLatest[i].name;
        changeLatestDonations[i].innerHTML = arrLatest[i].donation;
    }

    let changeAllTimeNames = document.getElementsByClassName("lbnamealltime");
    let changeAllTimeDonations = document.getElementsByClassName("lbdonationalltime");

    for (let i = 0; i < arrAllTime.length && i < changeAllTimeNames.length; i++) {
        changeAllTimeNames[i].innerHTML = arrAllTime[i].name;
        changeAllTimeDonations[i].innerHTML = arrAllTime[i].donation;
    }

    let changeDonatorsNames = document.getElementsByClassName("lbnamedonators");
    let changeDonatorsDonations = document.getElementsByClassName("lbdonationdonators");

    for (let i = 0; i < arrDonators.length && i < changeDonatorsNames.length; i++) {
        changeDonatorsNames[i].innerHTML = arrDonators[i].name;
        changeDonatorsDonations[i].innerHTML = arrDonators[i].donated;
    }

    reloadText.style.display = "block";

    setTimeout(function () {
        reloadText.style.display = "none";
    }, 1000);
}

function allChecksClicked() {
    if (cbEntrust.checked == true && cbWithdraw.checked == true) {
        notCheckedError.style.display = "none";
        checkboxes = true;
        isPayPalReady();

    }
    else {
        notCheckedError.style.display = "flex";
        checkboxes = false;
        isPayPalReady();
    }
}

function minimumDonation(e) {
    let tempDonation = e.target.value;
    parseFloat(tempDonation);
    if (tempDonation >= 1) {
        notMinimum.style.display = "none";
        minimum = true;
        isPayPalReady();
    }
    else if (tempDonation == "" || tempDonation < 1) {
        notMinimum.style.display = "flex";
        minimum = false;
        isPayPalReady();
    }
}

function shortenString(e) {
    let tempString = e.target.value;
    let stringsOvershooted = tempString.length - nameLength;

    if (tempString.length > nameLength) {
        for (i = 0; i < stringsOvershooted; i++) {
            tempString = tempString.slice(0, -1);
        }
        lbNameField.value = tempString;
    }
}

function isPayPalReady() {
    if (minimum == true && checkboxes == true) {
        PayPalButton.style.display = "block";
    }
    else {
        PayPalButton.style.display = "none";
    }
}

(function () {
    buttonOnce.addEventListener("click", event => {
        PaymentOverlay.style.display = "flex";
    });

    PaymentClickField.addEventListener("click", event => {
        PaymentOverlay.style.display = "none";
    });

    cbEntrust.addEventListener("click", event => {
        allChecksClicked();
    });

    cbWithdraw.addEventListener("click", event => {
        allChecksClicked();
    });

    lbNameField.addEventListener("input", event => {
        shortenString(event);
    });

    donAmountField.addEventListener("input", event => {
        minimumDonation(event);
    });

    PaymentSuccessMessage.addEventListener("click", event => {
        PaymentSuccessMessage.style.display = "none";
    });

    PaymentSuccessMessageNoLB.addEventListener("click", event => {
        PaymentSuccessMessageNoLB.style.display = "none";
    });

    PaymentCancelMessage.addEventListener("click", event => {
        PaymentCancelMessage.style.display = "none";
    });

    PaymentErrorMessage.addEventListener("click", event => {
        PaymentErrorMessage.style.display = "none";
    });

    reloadLB.addEventListener("click", event => {
        loadLeaderboards();
    });

    loadLeaderboards();
})();