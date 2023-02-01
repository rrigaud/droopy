<template>
    <q-page>
        <q-card>
            <q-card-section>
                <div class="row">
                    <q-btn-group style="margin-right : 20px">
                        <q-btn color="primary" @click="select" icon="cloud_download" :label="filePdfName" />
                        <q-btn outline color="primary" icon="remove_red_eye" @click="preview" />
                    </q-btn-group>
                    <q-input v-model="date" style="max-width: 120px; margin-right : 20px">
                        <template v-slot:prepend>
                            <q-icon name="event" class="cursor-pointer">
                                <q-popup-proxy ref="qDateProxy" transition-show="scale" transition-hide="scale">
                                    <q-date mask="YYYY-MM-DD" v-model="date" @input="() => $refs.qDateProxy.hide()" ></q-date>
                                </q-popup-proxy>
                            </q-icon>
                        </template>
                    </q-input>
                    <q-select v-model="classname" :options="classnameOptions" style="margin-right : 20px">
                        <template v-slot:prepend>
                            <q-icon name="group" />
                        </template>
                    </q-select>
                    <q-input class="col" v-model="name" placeholder="Nom de l'évaluation (Ex: IE - Théorème de Thalès)">
                        <template v-slot:prepend>
                            <q-icon name="edit" />
                        </template>
                    </q-input>
                </div>
            </q-card-section>
            <q-separator />
            <q-tabs
                v-model="tabAction"
                active-color="primary"
                indicator-color="primary"
                align="justify"
                inline-label
            >
                <q-tab name="tabCut" icon="horizontal_split" label="Découper le PDF" ></q-tab>
                <q-tab name="tabLink" icon="settings_ethernet" label="Elève <-> Copie <-> Note" ></q-tab>
                <q-tab name="tabExport" icon="cloud_upload" label="Distribuer les copies" ></q-tab>
            </q-tabs>
            <q-separator />
            <q-tab-panels v-model="tabAction" animated>
                <q-tab-panel name="tabCut">
                    <div class="row">
                        <q-btn-toggle v-model="nbPages" style="margin-right : 20px" toggle-color="primary" :options="nbPagesOptions" />
                        <q-btn-group class="col">
                            <q-btn class="col" color="primary" @click="cut" icon="horizontal_split" label="Découper le PDF" />
                            <q-btn class="col" color="secondary" @click="save" icon="archive" label="Archiver le PDF" />
                        </q-btn-group>
                    </div>
                </q-tab-panel>

                <q-tab-panel name="tabLink">
                    <div class="row" style="margin-bottom : 20px">
                        <q-linear-progress stripe rounded style="height: 20px" :value="linkProgress" />
                    </div>
                    <div class="row" style="margin-bottom : 20px">
                        <q-btn-dropdown
                            auto-close
                            split
                            icon="refresh"
                            color="primary"
                            label=""
                            @click="confirmRefreshFiles = true"
                            style="margin-right : 20px"
                        >
                            <!-- dropdown content goes here -->
                            <q-list padding style="width: 250px">
                                <q-item clickable @click="openFolderTemp">
                                    <q-item-section avatar>
                                        <q-avatar icon="folder" color="primary" text-color="white" />
                                    </q-item-section>
                                    <q-item-section>
                                        <q-item-label>Ouvrir le dossier temporaire</q-item-label>
                                    </q-item-section>
                                </q-item>
                                <q-separator inset />
                                <q-item clickable @click="delFolderTemp">
                                    <q-item-section avatar>
                                        <q-avatar icon="delete" color="negative" text-color="white" />
                                    </q-item-section>
                                    <q-item-section>
                                        <q-item-label text-color="negative">Supprimer le dossier temporaire</q-item-label>
                                    </q-item-section>
                                </q-item>
                            </q-list>
                        </q-btn-dropdown>
                        <q-dialog v-model="confirmRefreshFiles" persistent>
                            <q-card>
                                <q-card-section class="row items-center">
                                    <q-avatar icon="refresh" color="primary" text-color="white" />
                                    <span class="q-ml-sm">Attention, toutes les associations actuelles seront supprimées !</span>
                                </q-card-section>
                                <q-card-actions align="right">
                                    <q-btn flat label="Annuler" color="primary" v-close-popup />
                                    <q-btn @click="refreshFiles" label="Charger les copies" color="primary" v-close-popup />
                                </q-card-actions>
                            </q-card>
                        </q-dialog>
                        <q-btn-dropdown
                            auto-close
                            disable-main-btn
                            split
                            icon="insert_drive_file"
                            color="primary"
                            :label="fileIndex + 1"
                            style="margin-right : 20px"
                        >
                            <!-- dropdown content goes here -->
                            <q-list>
                                <q-item clickable v-close-popup v-for="file in filesData" :key="file.index" @click.native="loadFileToLink(file.index)">
                                    <q-item-section>
                                        <q-item-label>{{ file.label }}</q-item-label>
                                    </q-item-section>
                                </q-item>
                            </q-list>
                        </q-btn-dropdown>
                        <q-select
                            class="col"
                            outlined
                            clearable
                            ref="studentName"
                            v-model="student"
                            placeholder="Eleve"
                            use-input
                            hide-selected
                            fill-input
                            input-debounce="0"
                            :options="studentOptions"
                            @filter="studentFilter"
                            @input="setFocusToNote"
                            style="margin-right : 20px"
                        >
                            <template v-slot:prepend>
                                <q-icon name="person" />
                            </template>
                            <template v-slot:no-option>
                                <q-item>
                                    <q-item-section class="text-grey">
                                        Aucun résultat
                                    </q-item-section>
                                </q-item>
                            </template>
                        </q-select>
                        <q-input outlined v-model="note" ref="studentNote" placeholder="Note" @keydown.enter="link" style="margin-right : 20px">
                            <template v-slot:prepend>
                                <q-icon name="assessment" />
                            </template>
                        </q-input>
                        <q-btn color="primary" icon="link" @click="link" />
                    </div>
                    <div class="row">
                        <q-table
                            title=""
                            :data="filesData"
                            :columns="filesColumns"
                            :visible-columns="filesVisibleColumns"
                            row-key="index"
                            class="col"
                            rows-per-page-label="Copies par page"
                        ></q-table>
                    </div>
                </q-tab-panel>

                <q-tab-panel name="tabExport">
                    <div class="row" style="margin-bottom : 20px">
                        <q-btn-group class="col">
                            <q-btn class="col" color="primary" @click="sortFiles" icon="reorder" label="Classer les copies" />
                            <q-btn class="col" color="secondary" @click="exportFiles" icon="cloud_upload" label="Distribuer les copies" />
                            <q-btn class="col" color="positive" @click="exportResults" icon="grid_on" label="Exporter les notes" />
                        </q-btn-group>
                    </div>
                    <div class="row">
                        <q-table
                            :title="filesExportTitle"
                            :data="filesExportData"
                            :columns="filesExportColumns"
                            :visible-columns="filesExportVisibleColumns"
                            row-key="student"
                            class="col"
                            rows-per-page-label="Elèves par page"
                        ></q-table>
                    </div>
                </q-tab-panel>
            </q-tab-panels>
        </q-card>
    </q-page>
</template>

<style>
</style>

<script>
const electron = require('electron').remote;
const { clipboard, dialog, shell } = require('electron').remote;
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
// const homePath = electron.app.getPath('home');
const appDataPath = electron.app.getPath('appData');
const folderTemp = path.join(appDataPath, 'DroopyTempCut');
const PDFDocument = require('pdf-lib').PDFDocument;

export default {
    name: 'PageIndex',
    data () {
        return {
            tabAction: 'tabCut',
            prefs: { folderEvaluations: '' },
            filePdfName: 'Ouvrir un PDF...',
            filePdfURL: '',
            date: '',
            name: '',
            classname: 'Classe 1',
            classnameOptions: [
                { label: 'Classe 1', value: 'Classe 1' },
                { label: 'Classe 2', value: 'Classe 2' },
                { label: 'Classe 3', value: 'Classe 3' }
            ],
            nbFilesToMerge: 0,
            nbFilesMerged: 0,
            nbPages: '2',
            nbPagesOptions: [
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
                { label: '4', value: '4' },
                { label: '5', value: '5' },
                { label: '6', value: '6' }
            ],
            // Onglet link
            filesColumns: [
                { name: 'index', align: 'left', label: 'Index', field: 'index', sortable: true },
                { name: 'label', align: 'left', label: 'ID', field: 'label', sortable: true },
                { name: 'urlSource', align: 'left', label: 'URL Source', field: 'urlSource', sortable: true },
                { name: 'urlDestination', align: 'left', label: 'URL de Destination', field: 'urlDestination', sortable: true },
                { name: 'student', align: 'left', label: 'Elève', field: 'student', sortable: true, required: true },
                { name: 'note', align: 'left', label: 'Note', field: 'note', sortable: true }
            ],
            filesVisibleColumns: ['label', 'student', 'note'],
            filesData: [],
            confirmRefreshFiles: false,
            fileIndex: '',
            student: '',
            note: '',
            // studentOptionsSource contient tous les élèves de la classe sélectionnée
            studentOptionsSource: [],
            // studentOptions contient les élèves filtrés par le textInput autocomplete
            studentOptions: [],
            linkProgress: 0,
            // Onglet export
            filesExportTitle: '0 copies / 0 élèves (0 absents)',
            filesExportColumns: [
                { name: 'student', align: 'left', label: 'Elève', field: 'student', sortable: true, required: true },
                { name: 'note', align: 'left', label: 'Note', field: 'note', sortable: true },
                { name: 'urlSource', align: 'left', label: 'URL Source', field: 'urlSource', sortable: true },
                { name: 'urlDestination', align: 'left', label: 'URL de Destination', field: 'urlDestination', sortable: true }
            ],
            filesExportVisibleColumns: ['student', 'note', 'urlDestination'],
            filesExportData: [],
            nbFilesExported: 0
        }
    },
    methods: {
        /***************************************************************************************************************
        *  Function : splitPdf
        *
        *  Méthode asynchrone qui coupe un PDF par copies grâce à pdf-lib.js
        */
        async splitPdf (pathToPdf) {
            const docmentAsBytes = await fs.promises.readFile(pathToPdf);
            // Load your PDFDocument
            const pdfDoc = await PDFDocument.load(docmentAsBytes)
            const numberOfPages = pdfDoc.getPages().length;
            // On récupère le nombre de pages par copie
            let nbPages = parseInt(this.nbPages, '10');

            // Initialisation du numéro de page de la copie
            let index1 = 0;
            // On initialise un subDocument
            let subDocument = await PDFDocument.create();

            // Pour chaque page du PDF à découper
            for (let i = 0; i < numberOfPages; i++) {
                // Mise à jour du numéro de page de la copie
                index1++;
                // On récupère la page suivante et on l'ajoute au subDocument
                let [copiedPage] = await subDocument.copyPages(pdfDoc, [i])
                subDocument.addPage(copiedPage);
                // Si on a le bon nombre de pages pour la copie, on crée le PDF (sinon, on boucle pour ajouter la suivante)
                if (index1 === nbPages) {
                    let pdfBytes = await subDocument.save()
                    let dirName = folderTemp;
                    let fileName = path.join(dirName, 'copie_' + i + '.pdf');
                    fs.promises.writeFile(fileName, pdfBytes);
                    // On repart sur une nouvelle copie
                    index1 = 0;
                    subDocument = await PDFDocument.create();
                }
            }
            // Découpage réussi
            this.$q.notify({
                message: `Découpage du PDF : Création de copies de ${this.nbPages} pages terminée`,
                timeout: 3000,
                color: 'positive',
                icon: 'horizontal_split',
                position: 'bottom'
            });
        },
        /***************************************************************************************************************
        *  Function : loadDateToday
        *
        *  Charge la date du jour
        */
        loadDateToday () {
            let dateToday = new Date();
            let y = dateToday.getFullYear();
            let m = dateToday.getMonth() + 1; // Mois de 0 à 11
            let d = dateToday.getDate();
            this.date = '' + y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
        },
        /***************************************************************************************************************
        *  Function : loadClassnames
        *
        *  Charge les noms des classes dans le Select
        */
        loadClassnames () {
            if (this.$q.localStorage.getItem('folderEvaluations') === null) {
                this.$q.notify({
                    message: `Classes non trouvées... Avez-vous déjà sélectionné le dossier des évaluations (préférences) et généré les dossiers élèves (gestion des élèves) ?`,
                    timeout: 10000,
                    color: 'warning',
                    icon: 'group',
                    position: 'bottom'
                });
            } else {
                let folderEleves = path.join(this.$q.localStorage.getItem('folderEvaluations'), 'Eleves');
                fs.readdir(folderEleves, (err, items) => {
                    if (err) {
                        this.$q.notify({
                            message: `Classes non trouvées... Avez-vous déjà sélectionné le dossier des évaluations (préférences) et généré les dossiers élèves (gestion des élèves) ?`,
                            timeout: 10000,
                            color: 'warning',
                            icon: 'group',
                            position: 'bottom'
                        });
                    } else {
                        this.classnameOptions = [];
                        let classenames = items.filter(item => item.substring(0, 1) !== '.');
                        for (var i = 0; i < classenames.length; i++) {
                            this.classnameOptions.push({ label: classenames[i], value: classenames[i] });
                        }
                        this.classname = this.classnameOptions[0];
                        // Charge les élèves de cette classe dans le textInput Autocomplete
                        this.loadStudents(this.classname.value);
                    }
                });
            }
        },
        /***************************************************************************************************************
        *  Function : loadStudents
        *
        *  Charge les noms des élèves dans le textInput Autocomplete pour associer l'élève à sa copie
        *
        *  Parameters :
        *    (String) classname - Nom de la classe dont il faut charger les élèves
        */
        loadStudents (classname) {
            // console.log('Load : ' + classname);
            this.student = '';
            this.studentOptionsSource = [];
            this.studentOptions = [];
            let folderClassname = path.join(this.$q.localStorage.getItem('folderEvaluations'), 'Eleves', classname);
            fs.readdir(folderClassname, (err, items) => {
                if (err) throw err;
                let students = items.filter(item => item.substring(0, 1) !== '.');
                for (var i = 0; i < students.length; i++) {
                    // On remplit la liste source
                    this.studentOptionsSource.push(students[i]);
                    // On remplit la liste filtrée
                    this.studentOptions.push(students[i]);
                }
            });
        },
        /***************************************************************************************************************
        *  Function : select
        *
        *  Sélectionne le PDF contenant toutes les évaluations corrigées
        */
        select () {
            dialog.showOpenDialog({
                title: 'Sélectionner le fichier PDF à importer',
                defaultPath: this.$q.localStorage.getItem('folderEvaluations'),
                buttonLabel: 'Ouvrir ce PDF',
                filters: [ { name: 'PDF', extensions: ['pdf'] }, { name: 'Tous les fichiers', extensions: ['*'] } ],
                properties: ['openFile']
            }, (file) => {
                if (file && file.length > 0) {
                    // On stocke l'URL du PDF en mémoire
                    this.filePdfURL = file[0];
                    this.filePdfName = file[0].substring(file[0].lastIndexOf('/') + 1);
                }
            });
        },
        /***************************************************************************************************************
        *  Function : preview
        *
        *  Ouvre le PDF dans l'application par défaut de l'OS
        */
        preview () {
            if (this.filePdfURL !== '') {
                shell.openItem(this.filePdfURL);
            }
        },
        /***************************************************************************************************************
        *  Function : cut
        *
        *  Coupe le PDF contenant toutes les évaluations corrigées en PDF individuels
        */
        cut () {
            if (this.filePdfURL !== '') {
                this.$q.notify({
                    message: `Découpage du PDF : En cours...`,
                    timeout: 3000,
                    color: 'primary',
                    icon: 'horizontal_split',
                    position: 'bottom'
                });
                // Suppression du dossier temporaire (si jamais il n'avait pas été supprimé lors de la dernière utilisation)
                // Utilisation de fs-extra pour supprimer un dossier contenant des éléments (de manière simple et rapide)
                fsExtra.remove(folderTemp, (err) => {
                    if (err) throw err;
                    // Création d'un répertoire temporaire pour stocker les pages découpées
                    fs.mkdirSync(folderTemp);
                    this.splitPdf(this.filePdfURL);
                });
            } else {
                this.$q.notify({
                    message: `Découpage du PDF : Aucun fichier sélectionné...`,
                    timeout: 5000,
                    color: 'warning',
                    icon: 'horizontal_split',
                    position: 'bottom'
                });
            }
        },
        /***************************************************************************************************************
        *  Function : merge
        *
        *  Recolle les pages PDF découpées par groupe de 2/3/4/5/6 (nbPages)
        */
        merge () {
            this.$q.notify({
                message: `Découpage du PDF : Création de copies de ${this.nbPages} pages`,
                timeout: 3000,
                color: 'primary',
                icon: 'horizontal_split',
                position: 'bottom'
            });

            /*
            *  Explication technique :
            *
            *  Pour 3 pages par exemple, à partir du tableau "pages", on remplit un tableau "files"
            *  qui contiendra les pages regroupées par copies...
            *
            *  files[0][0] = pages[0]
            *  files[0][1] = pages[1]
            *  files[0][2] = pages[2]
            *  files[0][3] = 'cat output copie_1.pdf'
            *  files[1][0] = pages[3]
            *  files[1][1] = pages[4]
            *  files[1][2] = pages[5]
            *  files[1][3] = 'cat output copie_2.pdf'
            *  files[2][0] = pages[6]
            *  ...
            *
            *  Chaque files[index1] contient donc un tableau [page_1, page_2, page_3, cat output copie_1.pdf]
            *  qui sera nécessaire à passer en arguments de la commande "pdftk"
            */

            // On récupère les fichiers présents dans le dossier temporaire où l'on a découpé les pages PDF
            fs.readdir(folderTemp, (err, items) => {
                if (err) throw err;
                // De tous les fichiers trouvés (page_XX, et les indésirables, cachés ou pas), on ne garde que les "page_"
                let pages = items.filter(item => item.substring(0, 5) === 'page_');
                // On transforme nbPages en Integer pour éviter les problèmes
                let nbPages = parseInt(this.nbPages, '10');
                // Tableau qui va contenir les groupes de pages à recoller ensemble
                let files = [];
                // Initialisation de files[0][0]
                let index1 = 0;
                files[index1] = [];
                let index2 = 0;
                // Pour chaque page trouvée
                for (var i = 0; i < pages.length; i++) {
                    // Si on a le bon nombre de pages dans files[index1]
                    if (index2 === nbPages) {
                        // On doit ajouter le nom de la copie à la fin du tableau files[index1]
                        let numeroCopie = index1 + 1;
                        let nomCopie = 'cat output copie_' + numeroCopie + '.pdf';
                        files[index1][nbPages] = nomCopie;
                        // On passe à la copie suivante
                        index1++;
                        files[index1] = [];
                        index2 = 0;
                    }
                    // On associe la page à la bonne copie
                    files[index1][index2] = pages[i];
                    index2++;
                }
                // Ajout du nom de la dernière copie
                let numeroCopie = index1 + 1;
                let nomCopie = 'cat output copie_' + numeroCopie + '.pdf';
                files[index1][nbPages] = nomCopie;
                // console.log(files);

                // Initialisation du processus de suivi
                this.nbFilesToMerge = files.length;
                this.nbFilesMerged = 0;
                // Pour chaque copie
                for (var j = 0; j < files.length; j++) {
                    // On met en forme les paramètres pour pdftk
                    let pdfs = files[j].join(' ');
                    // On utilise le programme "pdfunite" en ligne de commande pour recoller les pages simples
                    // exec('pdfunite', files[j], (err, stdout, stderr) => {
                    exec('pdftk ' + pdfs, { cwd: folderTemp }, (error, stdout, stderr) => {
                        if (error) {
                            // console.log(error);
                        }
                        if (stderr) {
                            // console.log(stderr);
                        }
                        if (stdout) {
                            // console.log(stdout);
                        }
                        // On note que l'on vient de coller une copie de plus
                        this.nbFilesMerged++;
                        // console.log(this.nbFilesMerged + ' copies recollées');
                        // Si on vient de coller la dernière copie
                        if (this.nbFilesMerged === this.nbFilesToMerge) {
                            // Découpage réussi
                            this.$q.notify({
                                message: `Découpage du PDF : Création de copies de ${this.nbPages} pages terminée`,
                                timeout: 3000,
                                color: 'positive',
                                icon: 'horizontal_split',
                                position: 'bottom'
                            });
                        }
                    });
                }
            });
        },
        /***************************************************************************************************************
        *  Function : save
        *
        *  Sauvegarde le PDF contenant toutes les évaluations corrigées (archivage dans /Backup et suppression de /A corriger)
        */
        save () {
            // Si on n'a pas sélectionné de PDF
            if (this.filePdfURL === '') {
                this.$q.notify({
                    message: `Il faut sélectionner un PDF avant de pouvoir l'archiver...`,
                    timeout: 5000,
                    color: 'negative',
                    icon: 'warning',
                    position: 'bottom'
                });
            } else {
                this.prefs.folderEvaluations = this.$q.localStorage.getItem('folderEvaluations');
                // Si le dossier des "Evaluations" n'est pas renseigné dans les préférences
                if (this.prefs.folderEvaluations === '') {
                    // On explique que l'on en a besoin pour y sauvegarder notre PDF
                    this.$q.notify({
                        message: `Veuillez renseigner le dossier des "Evaluations" dans les préférences...`,
                        timeout: 5000,
                        color: 'negative',
                        icon: 'warning',
                        position: 'bottom'
                    });
                } else {
                    // Si aucun nom d'évaluation n'est rentrée
                    if (this.name === '') {
                        this.$q.notify({
                            message: `Veuillez donner un nom à cette évaluation...`,
                            timeout: 5000,
                            color: 'negative',
                            icon: 'warning',
                            position: 'bottom'
                        });
                    } else {
                        let fileToSave = this.filePdfURL;
                        // On crée le répertoire folderEvaluations/Backup
                        // (Si pas créé, ça aurait fait une erreur, si déjà créé, le recursive devrait en éviter une)
                        let folderBackup = path.join(this.prefs.folderEvaluations, 'Backup');
                        fs.mkdirSync(folderBackup, { recursive: true });
                        let fileBackup = path.join(folderBackup, this.date + ' - ' + this.classname.value + ' - ' + this.name + '.pdf');
                        fs.copyFile(fileToSave, fileBackup, (err) => {
                            if (err) throw err;
                            // console.log('Evaluation sauvegardée');
                            // Suppression du fichier source
                            fs.unlink(fileToSave, (err) => {
                                if (err) throw err;
                                this.$q.notify({
                                    message: `Evaluation sauvegardée dans /Backup !`,
                                    timeout: 3000,
                                    color: 'positive',
                                    icon: 'archive',
                                    position: 'bottom'
                                });
                                // Ouverture du fichier pour vérification
                                shell.openItem(fileBackup);
                                // On réinitialise le PDF ouvert à une valeur nulle
                                this.filePdfName = 'Ouvrir un PDF...';
                                this.filePdfURL = '';
                            });
                        });
                    }
                }
            }
        },
        /***************************************************************************************************************
        *  Function : refreshFiles
        *
        *  Charge la liste des copies à identifier ainsi que la liste des élèves de la classe
        */
        refreshFiles () {
            this.filesData = [];
            fs.readdir(folderTemp, (err, items) => {
                if (err) {
                    // Il n'y a pas de dossier temporaire
                    this.$q.notify({
                        message: `Il n'y aucune copie à charger. Il faut d'abord sélectionner et découper une évaluation PDF`,
                        timeout: 5000,
                        color: 'warning',
                        icon: 'warning',
                        position: 'bottom'
                    });
                } else {
                    // De tous les fichiers trouvés (copie_XX, page_XX, et les indésirables, cachés ou pas), on ne garde que les "copie_"
                    let copies = items.filter(item => item.substring(0, 6) === 'copie_');
                    for (var i = 0; i < copies.length; i++) {
                        this.filesData.push({ index: i, label: i + 1, urlSource: path.join(folderTemp, copies[i]), urlDestination: '', student: '', note: '' });
                    }
                    // Charge les élèves de la classe sélectionnée dans le textInput Autocomplete
                    this.loadStudents(this.classname.value);
                    // Met à jour la barre de progression
                    this.refreshLinkProgress();
                    // Sélectionne la première copie à associer
                    this.loadFileToLink(0);
                    // WIP : On essaie de donner le focus manuellement au q-input du nom de l'élève...
                    // Ca marchait à un moment en le faisant 2 fois ??? Plus maintenant... TOFIX
                    this.$refs.studentName.focus();
                    this.$refs.studentName.focus();
                }
            });
        },
        /***************************************************************************************************************
        *  Function : openFolderTemp
        *
        *  Ouvre le dossier temporaire où l'on découpe et associe les PDF (pourrait être utile ?)
        */
        openFolderTemp () {
            shell.openItem(folderTemp);
        },
        /***************************************************************************************************************
        *  Function : delFolderTemp
        *
        *  Supprime le dossier temporaire où l'on découpe et associe les PDF
        */
        delFolderTemp () {
            // Utilisation de fs-extra pour supprimer un dossier contenant des éléments (de manière simple et rapide)
            fsExtra.remove(folderTemp, (err) => {
                if (err) throw err;
                this.$q.notify({
                    message: `Dossier temporaire supprimé !`,
                    timeout: 3000,
                    color: 'positive',
                    icon: 'delete_forever',
                    position: 'bottom'
                });
            });
        },
        /***************************************************************************************************************
        *  Function : loadFileToLink
        *
        *  Charge la copie à identifier : son index, le nom de son élève et sa note
        *
        *  Parameters :
        *    (Integer) index - index de la copie à charger du tableau this.filesData
        */
        loadFileToLink (index) {
            this.fileIndex = index;
            this.student = this.filesData[index].student;
            this.note = this.filesData[index].note;
            // On ouvre la copie (PDF) dans un lecteur externe
            shell.openItem(this.filesData[index].urlSource);
        },
        /***************************************************************************************************************
        *  Function : setFocusToNote
        *
        *  Sur un changement de sélection de l'élève, on met le focus à la note
        */
        setFocusToNote () {
            this.$refs.studentNote.focus();
        },
        /***************************************************************************************************************
        *  Function : link
        *
        *  Enregistre le lien entre la copie, l'élève et sa note. Charge la copie suivante
        */
        link () {
            this.filesData[this.fileIndex].urlDestination = path.join(this.$q.localStorage.getItem('folderEvaluations'), 'Eleves', this.classname.value, this.student, this.date + ' - ' + this.classname.value + ' - ' + this.name + ' - ' + this.student + '.pdf');
            this.filesData[this.fileIndex].student = this.student;
            this.filesData[this.fileIndex].note = this.note;
            // console.log(this.filesData);
            // Met à jour la barre de progression
            this.refreshLinkProgress();
            // Si on a associé toutes les copies
            if (this.linkProgress === 1) {
                this.$q.notify({
                    message: `Toutes les copies ont été identifiées !`,
                    timeout: 3000,
                    color: 'positive',
                    icon: 'link',
                    position: 'bottom'
                });
            } else {
                // Sinon, on associe la copie suivante s'il reste une copie derrière
                if (this.fileIndex + 1 < this.filesData.length) {
                    this.loadFileToLink(this.fileIndex + 1);
                    this.$refs.studentName.focus();
                }
            }
        },
        /***************************************************************************************************************
        *  Function : refreshLinkProgress
        *
        *  Rafraichit la barre de progression
        */
        refreshLinkProgress () {
            let filesDataLinked = this.filesData.filter(item => item.student !== '');
            this.linkProgress = filesDataLinked.length / this.filesData.length;
        },
        /***************************************************************************************************************
        *  Function : studentFilter
        *
        *  Filtre les résultats du textInput Autocomplete pour sélectionner l'élève dont c'est la copie
        */
        studentFilter (val, update, abort) {
            update(() => {
                const needle = val.toLowerCase()
                this.studentOptions = this.studentOptionsSource.filter(v => v.toLowerCase().indexOf(needle) > -1)
            })
        },
        /***************************************************************************************************************
        *  Function : sortFiles
        *
        *  Trie les copies et affiche les notes et les élèves absents
        */
        sortFiles () {
            this.filesExportData = [];
            let nbFiles = this.filesData.length;
            let nbStudents = this.studentOptionsSource.length;
            for (var i = 0; i < nbStudents; i++) {
                let fileStudent = this.getFileStudent(this.studentOptionsSource[i]);
                this.filesExportData.push({ urlSource: fileStudent.urlSource, urlDestination: fileStudent.urlDestination, student: fileStudent.student, note: fileStudent.note });
            }
            // S'il y a plus de copies que d'élèves, c'est qu'il y a un problème !
            if (nbFiles > nbStudents) {
                // On le signale à l'utilisateur
                this.$q.notify({
                    message: `Attention, il y a ${nbFiles} copies pour seulement ${nbStudents} élèves !?`,
                    timeout: 5000,
                    color: 'warning',
                    icon: 'person',
                    position: 'bottom'
                });
            }
            // S'il y a des doublons (2 copies associées au même élève), c'est un problème...
            if (this.isThereDuplicateStudents()) {
                // On le signale à l'utilisateur
                this.$q.notify({
                    message: `Attention, il y a plusieurs copies associées au même élève !`,
                    timeout: 5000,
                    color: 'negative',
                    icon: 'person',
                    position: 'bottom'
                });
            } else {
                // Sinon, pas de soucis... on continue les tests...
                let filesDataNotLinked = this.filesData.filter(item => item.student === '');
                // Si toutes les copies n'ont pas bien été identifiées
                if (filesDataNotLinked.length !== 0) {
                    // On le signale à l'utilisateur
                    this.$q.notify({
                        message: `Attention, il reste ${filesDataNotLinked.length} copies non identifiées !`,
                        timeout: 5000,
                        color: 'warning',
                        icon: 'person',
                        position: 'bottom'
                    });
                } else {
                    // On dit qu'on peut les distribuer
                    this.$q.notify({
                        message: `Les ${nbFiles} copies ont toutes été identifiées, il ne reste qu'à les distribuer...`,
                        timeout: 5000,
                        color: 'positive',
                        icon: 'cloud_upload',
                        position: 'bottom'
                    });
                }
                // Quoi qu'il en soit, on affiche les statistiques de cette évaluation en haut
                let nbMissing = nbStudents - nbFiles;
                let nbLinked = nbFiles - filesDataNotLinked.length;
                this.filesExportTitle = nbLinked + ' / ' + nbFiles + ' copies identifiées pour une classe de ' + nbStudents + ' élèves (' + nbMissing + ' absents)';
            }
        },
        /***************************************************************************************************************
        *  Function : getFileStudent
        *
        *  Retourne les informations de la copie de l'élève
        *
        *  Parameters :
        *    (String) student - Nom de l'élève (Nom de son dossier Dropbox)
        *
        *  Returns :
        *    (Object) - {urlSource, urlDestination, student, note}
        */
        getFileStudent (student) {
            let fileInformations = { urlSource: '', urlDestination: '', student: student, note: '' };
            let nbFiles = this.filesData.length;
            for (var i = 0; i < nbFiles; i++) {
                if (this.filesData[i].student === student) {
                    fileInformations.urlSource = this.filesData[i].urlSource;
                    fileInformations.urlDestination = this.filesData[i].urlDestination;
                    fileInformations.note = this.filesData[i].note;
                    break;
                }
            }
            return fileInformations
        },
        /***************************************************************************************************************
        *  Function : isThereDuplicateStudents
        *
        *  Retourne true s'il y a des doublons (plusieurs copies pour un même élève)
        *
        *  Returns :
        *    (Boolean) - true s'il y a des doublons (plusieurs copies pour un même élève)
        */
        isThereDuplicateStudents () {
            let isThereDuplicates = false;
            let nbFiles = this.filesData.length;
            for (var i = 0; i < nbFiles; i++) {
                let filesForThisStudent = this.filesData.filter(item => item.student === this.filesData[i].student);
                // S'il y a plus d'une copie pour cet élève
                if (filesForThisStudent.length > 1) {
                    // Il y a donc au moins un doublon, on s'arrête là
                    isThereDuplicates = true;
                    break;
                }
            }
            return isThereDuplicates
        },
        /***************************************************************************************************************
        *  Function : exportFiles
        *
        *  Envoie les copies dans le dossier Dropbox de chaque élève, puis efface le dossier temporaire
        */
        exportFiles () {
            this.nbFilesExported = 0;
            // S'il y a des doublons (2 copies associées au même élève), c'est un problème...
            if (this.isThereDuplicateStudents()) {
                // On le signale à l'utilisateur
                this.$q.notify({
                    message: `Attention, il y a plusieurs copies associées au même élève !`,
                    timeout: 5000,
                    color: 'negative',
                    icon: 'person',
                    position: 'bottom'
                });
            } else {
                let filesDataNotLinked = this.filesData.filter(item => item.student === '');
                // Si toutes les copies n'ont pas bien été identifiées
                if (filesDataNotLinked.length !== 0) {
                    // On ne fait rien et on le signale à l'utilisateur
                    this.$q.notify({
                        message: `Attention, il reste ${filesDataNotLinked.length} copies non identifiées !`,
                        timeout: 5000,
                        color: 'negative',
                        icon: 'person',
                        position: 'bottom'
                    });
                } else {
                    let nbFiles = this.filesData.length;
                    // Pour chaque copie à distribuer
                    for (var i = 0; i < nbFiles; i++) {
                        // Si on a identifié la copie (on a une urlDestination)
                        if (this.filesData[i].urlDestination !== '') {
                            // On copie le fichier
                            fs.copyFile(this.filesData[i].urlSource, this.filesData[i].urlDestination, (err) => {
                                if (err) throw err;
                                this.nbFilesExported++;
                                // WIP : Faire une barre de progression
                                // Si on vient d'exporter la dernière copie
                                if (this.nbFilesExported === this.filesData.length) {
                                    // Export réussi
                                    this.$q.notify({
                                        message: `Export de ${this.nbFilesExported} copies terminée`,
                                        timeout: 5000,
                                        color: 'positive',
                                        icon: 'cloud_upload',
                                        position: 'bottom'
                                    });
                                    // On supprime le dossier temporaire
                                    this.delFolderTemp();
                                }
                            });
                        } else {
                            // Sinon, il y a eu un problème de test avant, on rappelle d'aller tout identifier avant d' exporter
                            this.$q.notify({
                                message: `Une copie n'a pas été exportée car non identifée...`,
                                timeout: 3000,
                                color: 'negative',
                                icon: 'person',
                                position: 'bottom'
                            });
                        }
                    }
                }
            }
        },
        /***************************************************************************************************************
        *  Function : exportResults
        *
        *  Exporte un tableau Elève/Note vers un tableur (pour les copier/coller vers Pronotes avec plus de souplesse)
        */
        exportResults () {
            let nbStudents = this.filesExportData.length;
            // Initialisation du texte à exporter
            let resultsToExport = 'Elève\tNote\r\n';
            // Pour chaque élève de la classe
            for (var i = 0; i < nbStudents; i++) {
                resultsToExport += this.filesExportData[i].student + '\t' + this.filesExportData[i].note + '\r\n';
            }
            clipboard.writeText(resultsToExport);
            this.$q.notify({
                message: `Les résultats ont été copiés dans le presse-papier, il n'y a plus qu'à les coller dans un tableur...`,
                timeout: 5000,
                color: 'positive',
                icon: 'cloud_upload',
                position: 'bottom'
            });
            // WIP : Export vers Libreoffice Calc Ok, mais vers Numbers (Mac), le caractère Tab ne passe pas, il faut
            // voir du coté de :
            // clipboard.writeText('A1' + String.fromCharCode(10) + 'A2\r\nB1' + String.fromCharCode(10) + 'B2');
        }
    },
    created () {
        this.loadDateToday();
        this.loadClassnames();
    }
}
</script>
