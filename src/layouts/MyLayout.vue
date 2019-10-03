<template>
    <q-layout view="lHh Lpr lFf">
        <q-header elevated>
            <q-toolbar class="bg-secondary text-white">
                <img src="statics/Logo_Droopy.png">
                <q-toolbar-title>DROOPY (DROpbox cOPY)</q-toolbar-title>
                <q-btn flat round icon="group" @click="dialogStudents = true"></q-btn>
                <q-btn flat round icon="settings" @click="showPrefs"></q-btn>
            </q-toolbar>
        </q-header>

        <q-dialog v-model="dialogStudents" full-width>
            <q-card>
                <q-toolbar>
                    <q-avatar>
                        <q-icon name="group" />
                    </q-avatar>

                    <q-toolbar-title>Gestion des élèves</q-toolbar-title>

                    <q-btn flat round dense icon="close" v-close-popup />
                </q-toolbar>
                <q-card-section>
                    <div class="row">
                        <q-btn color="primary" @click="selectCSV" icon="group_add" label="Importer un CSV..." />
                        <div class="col"></div>
                        <q-btn color="warning" @click="createDropboxFolders" icon="create_new_folder" label="Générer les dossiers" style="margin-right : 20px" />
                        <q-btn color="primary" @click="exportCryptedJS" icon="cloud_upload" label="Exporter JS chiffré" />
                    </div>
                </q-card-section>
                <q-card-section>
                    <q-table
                        title="Elèves importés"
                        :data="studentsData"
                        :columns="studentsColumns"
                        row-key="name"
                    ></q-table>
                </q-card-section>
            </q-card>
        </q-dialog>

        <q-dialog v-model="dialogSettings">
            <q-card style="width: 700px; max-width: 80vw;">
                <q-toolbar>
                    <q-avatar>
                        <q-icon name="settings" />
                    </q-avatar>

                    <q-toolbar-title>Préférences</q-toolbar-title>

                    <q-btn flat round dense icon="close" v-close-popup />
                </q-toolbar>
                <q-card-section>
                    <div class="row">
                        <q-input outlined bottom-slots v-model="prefs.folderEvaluations" label="Dossier Source des évaluations (contenant / A corriger, /Backup et /Eleves)" class="col">
                            <template v-slot:prepend>
                                <q-icon name="folder" />
                            </template>
                            <template v-slot:append>
                                <q-icon name="close" @click="setPrefsFolderEvaluations" class="cursor-pointer" />
                            </template>
                        </q-input>
                    </div>
                </q-card-section>
            </q-card>
        </q-dialog>

        <q-page-container>
            <router-view />
        </q-page-container>
    </q-layout>
</template>

<script>
import { openURL } from 'quasar'

const { dialog } = require('electron').remote;
const fs = require('fs');
const path = require('path');
var csv = require('fast-csv');
/***************************************************************************************************************
 *  Function : sha256
 *
 *  Cette fonction gère le hashage des identifiants
 *
 *  Parameters :
 *    (String) ascii - Texte à hasher
 */
var sha256 = function sha256 (ascii) {
    function rightRotate (value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    };
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length'
    var i, j; // Used as a counter across the whole file
    var result = ''

    var words = [];
    var asciiBitLength = ascii[lengthProperty] * 8;
    // caching results is optional - remove/add slash from front of this line to toggle
    // Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
    // (we actually calculate the first 64, but extra values are just ignored)
    var hash = sha256.h = sha256.h || [];
    // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
    var k = sha256.k = sha256.k || [];
    var primeCounter = k[lengthProperty];
    /*
    var hash = [], k = [];
    var primeCounter = 0;
    */

    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }
    ascii += '\x80' // Append Ƈ' bit (plus zero padding)
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00' // More zero padding
    for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return; // ASCII check: only accept characters in range 0-255
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength)
    // process each chunk
    for (j = 0; j < words[lengthProperty];) {
        var w = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration
        var oldHash = hash;
        // This is now the undefinedworking hash", often labelled as variables a...g
        // (we have to truncate as well, otherwise extra entries at the end accumulate
        hash = hash.slice(0, 8);
        for (i = 0; i < 64; i++) {
            // var i2 = i + j;
            // Expand the message into 64 words
            // Used below if
            var w15 = w[i - 15], w2 = w[i - 2];

            // Iterate
            var a = hash[0], e = hash[4];
            var temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
            // This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
            var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2])); // maj
            hash = [(temp1 + temp2) | 0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
            hash[4] = (hash[4] + temp1) | 0;
        }
        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }
    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            var b = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? 0 : '') + b.toString(16);
        }
    }
    return result;
};

export default {
    name: 'MyLayout',
    data () {
        return {
            dialogStudents: false,
            dialogSettings: false,
            prefs: { folderEvaluations: '' },
            studentsColumns: [
                { name: 'classname', align: 'left', label: 'Classe', field: 'classname', sortable: true },
                { name: 'lastname', align: 'left', label: 'NOM', field: 'lastname', sortable: true, required: true },
                { name: 'firstname', align: 'left', label: 'Prénom', field: 'firstname', sortable: true, required: true },
                { name: 'gender', align: 'left', label: 'Sexe', field: 'gender', sortable: true },
                { name: 'login', align: 'left', label: 'Login (identifiant)', field: 'login' },
                { name: 'password', align: 'left', label: 'Password', field: 'password' },
                { name: 'dropboxFolder', align: 'left', label: 'Dossier Dropbox', field: 'dropboxFolder' }
            ],
            studentsData: [
                {
                    classname: '3RD',
                    lastname: 'ATTON',
                    firstname: 'Olivier',
                    gender: 'M',
                    login: 'attono',
                    password: 'Torch083*3',
                    dropboxFolder: '...'
                },
                {
                    classname: '3RD',
                    lastname: 'PRICE',
                    firstname: 'Thomas',
                    gender: 'M',
                    login: 'pricet',
                    password: 'Avio071*3',
                    dropboxFolder: '...'
                }
            ]
        }
    },
    methods: {
        openURL,
        /***************************************************************************************************************
        *  Function : selectCSV
        *
        *  Selectionne le fichier CSV des élèves à importer
        */
        selectCSV () {
            // On sélectionne le fichier CSV à importer
            dialog.showOpenDialog({
                title: 'Sélectionner le fichier CSV des élèves à importer',
                buttonLabel: 'Importer ce CSV',
                filters: [ { name: 'CSV', extensions: ['csv'] }, { name: 'Tous les fichiers', extensions: ['*'] } ],
                properties: ['openFile']
            }, (file) => {
                if (file && file.length > 0) {
                    // Import des élèves du fichier CSV
                    this.importStudents(file[0]);
                }
            });
        },
        /***************************************************************************************************************
        *  Function : importStudents
        *
        *  Importe des élèves dans le tableau studentsData à partir de champs récupérés dans un CSV
        *
        *  Parameters :
        *    (File Object) csvFile - Fichier CSV à importer
        */
        importStudents (csvFile) {
            this.studentsData = [];
            csv
                .parseFile(csvFile)
                .on('data', row => {
                    this.studentsData.push({ classname: row[0], lastname: row[1], firstname: row[2], gender: row[3], login: row[4], password: row[5], dropboxFolder: row[6] });
                })
                .on('end', rowCount => {
                    this.$q.notify({
                        message: `Nombre d'élèves importés : ${rowCount} `,
                        timeout: 4000,
                        color: 'positive',
                        icon: 'account_box',
                        position: 'bottom'
                    });
                });
        },
        /***************************************************************************************************************
        *  Function : createDropboxFolders
        *
        *  Génère l'arborescence des /Classes/Elèves dans le dossier Dropbox folderEvaluations/Elèves
        */
        createDropboxFolders () {
            this.prefs.folderEvaluations = this.$q.localStorage.getItem('folderEvaluations');
            // Si on a un dossier Dropbox dans lequel générer les élèves
            if (this.prefs.folderEvaluations !== '') {
                let nbEleves = this.studentsData.length;
                // Pour chaque élève
                for (var i = 0; i < nbEleves; i++) {
                    let folderEleve = path.join(this.prefs.folderEvaluations, 'Eleves', this.studentsData[i].classname, this.studentsData[i].lastname + ' ' + this.studentsData[i].firstname);
                    // On crée son répertoire /Classe/Elève
                    fs.mkdirSync(folderEleve, { recursive: true });
                }
                this.$q.notify({
                    message: `Les dossiers élèves ont été créés. Au prochain démarrage, les classes seront automatiquement chargées.`,
                    timeout: 5000,
                    color: 'positive',
                    icon: 'folder_shared',
                    position: 'bottom'
                });
            } else {
                // Sinon, on demande de sélectionner le folderEvaluations dans les préférences
                this.$q.notify({
                    message: `Impossible de générer les dossiers sans avoir sélectionné le dossier des évaluations (préférences) !`,
                    timeout: 10000,
                    color: 'negative',
                    icon: 'error',
                    position: 'bottom'
                });
            }
        },
        /***************************************************************************************************************
        *  Function : exportCryptedJS
        *
        *  Exporte un fichier JS avec les noms des élèves chiffrés pour le site public (rigaudr.fr)
        */
        exportCryptedJS () {
            // On sélectionne le dossier dans lequel exporter le fichier JS
            dialog.showOpenDialog({
                title: 'Sélectionner le dossier dans lequel exporter le fichier JS',
                buttonLabel: 'Exporter dans ce répertoire',
                properties: ['openDirectory']
            }, (folder) => {
                if (folder && folder.length > 0) {
                    // Dossier d'export
                    let folderExport = folder[0];
                    // Contenu à exporter
                    let studentsContent = 'const Students = [ \r\n';
                    let nbEleves = this.studentsData.length;
                    // Pour chaque élève
                    for (var i = 0; i < nbEleves; i++) {
                        studentsContent += "{ Login: '" + sha256(this.studentsData[i].login) + "', \r\n";
                        studentsContent += "Niveau: '" + this.studentsData[i].classname.substring(0, 1) + "', \r\n";
                        studentsContent += "Dropbox: '" + this.studentsData[i].dropboxFolder + "' }, \r\n";
                    }
                    studentsContent += ']';
                    // console.log(studentsContent);
                    // On exporte le fichier "students.js"
                    let studentsFile = path.join(folderExport, 'students.js');
                    fs.writeFile(studentsFile, studentsContent, (err) => {
                        if (err) throw err;
                        this.$q.notify({
                            message: `Le fichier "students.js" a été exporté`,
                            timeout: 4000,
                            color: 'positive',
                            icon: 'enhanced_encryption',
                            position: 'bottom'
                        });
                    });
                }
            });
        },
        /***************************************************************************************************************
        *  Function : showPrefs
        *
        *  Affiche la fenêtre de dialogue des Préférences
        */
        showPrefs () {
            this.prefs.folderEvaluations = this.$q.localStorage.getItem('folderEvaluations');
            this.dialogSettings = true;
        },
        /***************************************************************************************************************
        *  Function : setPrefsFolderEvaluations
        *
        *  Sélectionne le dossier des évaluations de sa Dropbox et l'enregistre en localStorage
        */
        setPrefsFolderEvaluations () {
            // On sélectionne le dossier /Evaluations dans sa Dropbox
            dialog.showOpenDialog({
                title: 'Sélectionner le dossier "Evaluations" de votre Dropbox',
                buttonLabel: 'Sélectionner ce répertoire',
                properties: ['openDirectory']
            }, (folder) => {
                if (folder && folder.length > 0) {
                    // Dossier /Elèves
                    this.$q.localStorage.set('folderEvaluations', folder[0]);
                    this.prefs.folderEvaluations = folder[0];
                    this.$q.notify({
                        message: `Préférences : Dossier "Evaluations" enregistré`,
                        timeout: 4000,
                        color: 'positive',
                        icon: 'save',
                        position: 'bottom'
                    });
                }
            });
        }
    }
}
</script>

<style>
</style>
