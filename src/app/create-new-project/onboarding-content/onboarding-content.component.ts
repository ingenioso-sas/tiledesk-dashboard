import { Component, OnInit, isDevMode } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from "@angular/common/http";
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
// import { Observable } from 'rxjs';
import { UrlService } from 'app/services/shared/url.service';

import { Project } from 'app/models/project-model';
import { WidgetSetUpBaseComponent } from 'app/widget_components/widget-set-up/widget-set-up-base/widget-set-up-base.component';
import { ProjectService } from 'app/services/project.service';
import { BrandService } from 'app/services/brand.service';
import { LoggerService } from 'app/services/logger/logger.service';
import { AuthService } from 'app/core/auth.service';
import { emailDomainWhiteList } from 'app/utils/util';
import { FaqKbService } from 'app/services/faq-kb.service';
import { BotLocalDbService } from 'app/services/bot-local-db.service';
import { DepartmentService } from 'app/services/department.service';
import { FaqService } from 'app/services/faq.service';


export enum TYPE_STEP {
  NAME_PROJECT= "nameProject",
  CUSTOM_STEP = "customStep",
  WELCOME_MESSAGE = "welcomeMessage",
  WIDGET_INSTALLATION = "widgetInstallation"
}

@Component({
  selector: 'cnp-onboarding-content',
  templateUrl: './onboarding-content.component.html',
  styleUrls: ['./onboarding-content.component.scss']
})
export class OnboardingContentComponent extends WidgetSetUpBaseComponent implements OnInit {
  previousUrl:string;
  logo_x_rocket: string;
  DISPLAY_SPINNER_SECTION = false;
  CLOSE_BTN_IS_HIDDEN = true;
  DISPLAY_SPINNER = false;

  companyLogoBlack_Url: string;
  temp_SelectedLangName: string;
  temp_SelectedLangCode: string;
  botid: string;
  browser_lang: string;
  
  activeQuestionNumber: number;
  activeQuestion: any;
  DISABLED_NEXT_BUTTON: boolean = true;
  DISABLED_PREV_BUTTON: boolean = true;
  welcomeMessage: string = "";
  defaultFallback: string = "";

  projects: Project[];
  newProject: any;
  projectName: string;
  projectID: string;
  user: any;
  userFullname: string;

  translateY: string;
  typeStep = TYPE_STEP;
  nameLastStep: TYPE_STEP = null;
  nameMsgStep: TYPE_STEP = null;
  arrayOfSteps: TYPE_STEP[] = [];
  activeTypeStepNumber: number = 0;
  activeCustomStepNumber: number;
  customSteps: any[] = [];
  activeStep: any;

  // DISPLAY_BOT:boolean = false;
  CREATE_BOT_ERROR: boolean = false;
  botId: string;
  CREATE_FAQ_ERROR: boolean = false;

  segmentIdentifyAttributes: any = {};
  isFirstProject: boolean = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    public location: Location,
    public brandService: BrandService,
    private logger: LoggerService,
    private route: ActivatedRoute,
    public translate: TranslateService,
    private httpClient: HttpClient,
    private projectService: ProjectService,
    private urlService: UrlService,
    private faqService: FaqService,
    private faqKbService: FaqKbService,
    private botLocalDbService: BotLocalDbService,
    private departmentService: DepartmentService,
  ) {
    super(translate);
    const brand = brandService.getBrand();
    this.logo_x_rocket = brand['wizard_create_project_page']['logo_x_rocket'];
    this.companyLogoBlack_Url = brand['company_logo_black__url'];
    this.botid = this.route.snapshot.params['botid'];
  }



  // SYSTEM FUNCTIONS //
  ngOnInit() {

    // this.previousUrl = this.urlService.getPreviousUrl(); //!!! non sempre restituisce la pg di prev !!!
    // this.isFirstProject = false;
    // if(this.previousUrl.endsWith('/signup')){
    //   this.isFirstProject = true;
    // }
    // console.log('previousUrl2:: ', this.previousUrl, this.isSignupPrevPage);
    //this.checkCurrentUrlAndHideCloseBtn();
    // 
    this.getCurrentTranslation();
    // console.log('[WIZARD - CREATE-PRJCT] previousUrl ', this.previousUrl);
    this.initialize();
  }



  // CUSTOM FUNCTIONS //
  private getCurrentTranslation() {  
    let langDashboard = 'en';
    if(this.translate.currentLang){
      langDashboard = this.translate.currentLang;
    }  
    let jsonWidgetLangURL = 'assets/i18n/'+langDashboard+'.json';
    this.httpClient.get(jsonWidgetLangURL).subscribe(data =>{
      try {
        if(data['OnboardPage']){
          let translations = data['OnboardPage'];
          this.welcomeMessage = translations["WelcomeMessage"];
          this.defaultFallback = translations["DefaultFallback"];
        }
      } catch (err) {
        this.logger.error('error', err);
      }
    });
  }
    

  // private checkCurrentUrlAndHideCloseBtn() {
  //   if (this.router.url.startsWith('/create-project-itw/')) {
  //     // this.CREATE_PRJCT_FOR_TEMPLATE_INSTALLATION = true;
  //     this.browser_lang = this.translate.getBrowserLang();
  //     if (tranlatedLanguage.includes(this.browser_lang)) {
  //       const langName = this.getLanguageNameFromCode(this.browser_lang);
  //       this.temp_SelectedLangName = langName;
  //       this.temp_SelectedLangCode = this.browser_lang;
  //     } else {
  //       this.temp_SelectedLangName = 'English';
  //       this.temp_SelectedLangCode = 'en';
  //     }
  //   }  else if (this.router.url === '/create-project') {
  //     this.CLOSE_BTN_IS_HIDDEN = true;
  //     // this.CREATE_PRJCT_FOR_TEMPLATE_INSTALLATION = false;
  //   } else if (this.router.url === '/create-new-project') {
  //     this.CLOSE_BTN_IS_HIDDEN = false;
  //     // this.CREATE_PRJCT_FOR_TEMPLATE_INSTALLATION = false;
  //   }
  // }

 

  private setProjectName(){
    let projectName = null;
    //const email = this.userForm.value['email'];
    const email = this.user.email;
    if (email.includes('@')) {
      const emailAfterAt = email.split('@')[1];
      if (!emailDomainWhiteList.includes(emailAfterAt)) {
        if (emailAfterAt.includes('.'))
          projectName = emailAfterAt.split('.')[0]
        else if (!emailAfterAt.includes('.')) {
          projectName = emailAfterAt;
        }
      }
    }
    return projectName;
  }



  private initialize(){
    this.translateY = 'translateY(0px)';
    this.activeQuestionNumber = 0;
    // this.setFirstStep();
    this.getProjects();
  }



  private getProjects() {
    this.projectService.getProjects().subscribe((projects: any) => {
      this.isFirstProject = true;
      if (projects) {
        this.projects = projects;
      }
      if (projects.length>0) {
        this.isFirstProject = false;
      }
      // console.log('getProjects:: ', projects, this.isFirstProject);
      this.getLoggedUser();
    });

    // this.auth.project_bs
    //   .subscribe((project) => {
    //     this.isFirstProject = true;
    //     if (project) {
    //       this.projectID = project._id;
    //       this.projectName = project.name;
    //       this.isFirstProject = false;
    //     }
    //     console.log('getCurrentProject:: ', project);
    //     this.getLoggedUser();
    //   });
  }

  private getLoggedUser() {
    this.auth.user_bs.subscribe((user) => {
      if (user) {
        this.user = user;
        this.userFullname = user.displayName?user.displayName:user.firstname;
        // console.log('getLoggedUser:: ', user);
        // this.projectName = this.setProjectName();
        // console.log('setProjectName:: ', this.projectName, this.isSignupPrevPage);

        if(this.isFirstProject){
          // console.log('[WIZARD - CREATE-PRJCT] project_name ', this.projectName);
          this.projectName = this.setProjectName();
          if (!this.projectName){
            this.arrayOfSteps.push(TYPE_STEP.NAME_PROJECT);
          }
          this.setFirstStep();
          // console.log('YES isFirstProject:: ', this.arrayOfSteps);
        } else {
          this.arrayOfSteps.push(TYPE_STEP.NAME_PROJECT);
          this.arrayOfSteps.push(TYPE_STEP.WELCOME_MESSAGE);
          this.arrayOfSteps.push(TYPE_STEP.WIDGET_INSTALLATION);
          // console.log('NO isFirstProject:: ', this.arrayOfSteps);
        }

      }
    });
  }

  
  private setFirstStep(){
    // console.log('setFirstStep:: ');
    // if(this.previousUrl.endsWith('/signup')){
      let lang = "en";
      if(this.translate.currentLang){
        lang = this.translate.currentLang;
      }
      let onboardingConfig = 'assets/config/onboarding-config-'+lang+'.json';
      // console.log('onboardingConfig:: ', onboardingConfig, lang);
      this.checkFileExists(onboardingConfig).then(result => {
        if(result === false){
          onboardingConfig = 'assets/config/onboarding-config.json';
        }
        this.loadJsonOnboardingConfig(onboardingConfig);
      });
    // } else {
    //   this.arrayOfSteps.push(TYPE_STEP.WELCOME_MESSAGE);
    // }
  }



  private loadJsonOnboardingConfig(onboardingConfig){
    // let lang = "en";
    // if(this.translate.currentLang){
    //   lang = this.translate.currentLang;
    // }
    // let onboardingConfig = 'assets/config/onboarding-config-'+lang+'.json';
    // console.log('loadJsonOnboardingConfig:: ',onboardingConfig);
    let jsonSteps: any;
    this.httpClient.get(onboardingConfig).subscribe(data => {
      let jsonString = JSON.stringify(data);
      jsonString = jsonString.split('${userFullname}').join(this.userFullname);
      let jsonParse = JSON.parse(jsonString);
      if (jsonParse) {
        jsonSteps = jsonParse['steps'];
        jsonSteps.forEach(step => {
          this.customSteps.push(step);
          this.arrayOfSteps.push(TYPE_STEP.CUSTOM_STEP);
        });
      }
      if(this.customSteps.length>0){
        // this.arrayOfSteps.push(TYPE_STEP.CUSTOM_STEP);
        this.activeCustomStepNumber = 0;
        this.activeStep = this.customSteps[0];
        this.activeQuestion = this.customSteps[0].questions[0];    
      }
      this.arrayOfSteps.push(TYPE_STEP.WELCOME_MESSAGE);
      this.arrayOfSteps.push(TYPE_STEP.WIDGET_INSTALLATION);
    });
  }

  private checkFileExists(fileName: string): Promise<boolean> {
    const url = `${fileName}`;
    return this.httpClient.get(url, { responseType: 'json' })
      .toPromise()
      .then(() => true)
      .catch(() => false);
  }

  private nextNumberStep(){
    this.activeTypeStepNumber++;
    this.translateY = 'translateY('+(-(this.activeTypeStepNumber+1)*20+20)+'px)';
  }

  private prevNumberStep(){
    this.activeTypeStepNumber--;
    this.translateY = 'translateY('+(-(this.activeTypeStepNumber+1)*20+20)+'px)';
  }

  private checkQuestions(){
    this.activeStep = this.customSteps[this.activeCustomStepNumber];
    this.activeQuestionNumber = this.activeStep.questions.length;
    for (let i = 0; i < this.activeStep.questions.length; i++) {
      let action = this.activeStep.questions[i];
      if(!action.answer){
        this.activeQuestionNumber = i;
        break;
      }
    }
    this.activeQuestion = this.activeStep.questions[this.activeQuestionNumber];
    if(this.activeQuestionNumber < this.activeStep.questions.length){
      this.DISABLED_NEXT_BUTTON = true;
    } else {
      this.DISABLED_NEXT_BUTTON = false;
    }
  }


  private checkPrevButton(){
    // || (this.activeTypeStepNumber == 1 && this.arrayOfSteps[0] === TYPE_STEP.NAME_PROJECT)
    if(this.activeTypeStepNumber == 0){
      this.DISABLED_PREV_BUTTON = true;
    } else {
      this.DISABLED_PREV_BUTTON = false
    }
  }
  


  // ---------- EVENTS FUNCTIONS -------------- //
  goToSetProjectName($event){
    this.projectName = $event;
    this.nextNumberStep();
    //this.createNewProject(true);
  }

  goToNextQuestion($event){
    this.segmentIdentifyAttributes = $event;
    // console.log('goToNextQuestion::: ', $event, this.segmentIdentifyAttributes)
    this.checkQuestions();
  }

  goToNextCustomStep(){
    if(this.activeCustomStepNumber < (this.customSteps.length-1)){
      this.activeCustomStepNumber++;
      this.activeStep = this.customSteps[this.activeCustomStepNumber];
      this.checkQuestions();
      this.activeQuestionNumber = 0;
      this.activeQuestion = this.activeStep.questions[0];
      this.goToNextStep();
    } else {
      this.goToNextStep();
    }
  }

  goToPrevCustomStep() {
    if(this.activeCustomStepNumber > 0){
      this.activeCustomStepNumber--;
      this.activeStep = this.customSteps[this.activeCustomStepNumber];
      this.activeQuestionNumber = this.activeStep.questions.length-1;
      this.activeQuestion = this.activeStep.questions[this.activeQuestionNumber];
      this.DISABLED_NEXT_BUTTON = false;
      this.goToPrevStep();
    } else {
      this.goToPrevStep();
    }
  }

  goToPrevStep() {
    this.prevNumberStep();
    this.checkPrevButton();
  }

  goToNextStep() {
    // this.DISPLAY_SPINNER_SECTION = false;  
    if(this.segmentIdentifyAttributes && this.segmentIdentifyAttributes["solution_channel"] === "whatsapp_fb_messenger"){
      this.arrayOfSteps.splice(this.arrayOfSteps.length - 2);
      this.createNewProject();
    } else {
      this.nextNumberStep();
      this.checkPrevButton();
    }
  }


  goToSaveWelcomeMessage($event){
    try {
      this.welcomeMessage = $event.msg;    
    } catch (error) {
      this.logger.error('[WIZARD - error: ', error);
    }
    // console.log('segmentAttributes:: ',this.segmentAttributes);
    this.goToNextStep();
  }

  goToSaveProjectAndCreateBot($event){
    this.createNewProject();
    // if(this.arrayOfSteps[0] === TYPE_STEP.NAME_PROJECT){
    //   this.createNewProject();
    // } else {
    //   this.createBot();
    // }
  }

  goBack() {
    this.location.back();
  }

  goToExitOnboarding(){
    if(this.isFirstProject){
      this.router.navigate(['project/' + this.newProject.id  + '/home'])
    } else {
      this.location.back();
    }
  }



  /** 
   * SERVICES  
   * create project and bot 
   * */
  private createNewProject() {
    this.DISPLAY_SPINNER_SECTION = true;
    this.DISPLAY_SPINNER = true;
    this.projectService.createProject(this.projectName, 'onboarding-content').subscribe((project) => {
      this.logger.log('[WIZARD - CREATE-PRJCT] POST DATA PROJECT RESPONSE ', project);
      if (project) {
        this.newProject = project
        // WHEN THE USER SELECT A PROJECT ITS ID IS SEND IN THE PROJECT SERVICE THET PUBLISHES IT
        // THE SIDEBAR SIGNS UP FOR ITS PUBLICATION
        const newproject: Project = {
          _id: project['_id'],
          name: project['name'],
          operatingHours: project['activeOperatingHours'],
          profile_type: project['profile'].type,
          profile_name: project['profile'].name,
          trial_expired: project['trialExpired']
        }
        // SENT THE NEW PROJECT TO THE AUTH SERVICE THAT PUBLISH
        this.auth.projectSelected(newproject)
        this.logger.log('[WIZARD - CREATE-PRJCT] CREATED PROJECT ', newproject)
        this.projectID = newproject._id
      }
      /* 
        * !!! NO MORE USED - NOW THE ALL PROJECTS ARE SETTED IN THE STORAGE IN getProjectsAndSaveInStorage()
        * SET THE project_id IN THE LOCAL STORAGE
        * WHEN THE PAGE IS RELOADED THE SIDEBAR GET THE PROJECT ID FROM THE LOCAL STORAGE 
      */
    }, (error) => {
      this.DISPLAY_SPINNER = false;
      this.logger.error('[WIZARD - CREATE-PRJCT] CREATE NEW PROJECT - POST REQUEST - ERROR ', error);
    }, () => {
      // console.log('[WIZARD - CREATE-PRJCT] CREATE NEW PROJECT - POST REQUEST * COMPLETE *');
      this.projectService.newProjectCreated(true);
      const trialStarDate = moment(new Date(this.newProject.createdAt)).format("YYYY-MM-DD hh:mm:ss")
      const trialEndDate = moment(new Date(this.newProject.createdAt)).add(30, 'days').format("YYYY-MM-DD hh:mm:ss")
      
      // let segmentPageName = "Wizard, Create project";
      // let segmentTrackName = "Trial Started";
      // let segmentTrackAttr = {
      //   "userId": this.user._id,
      //   "trial_start_date": trialStarDate,
      //   "trial_end_date": trialEndDate,
      //   "trial_plan_name": "Pro (trial)",
      //   "context": {
      //     "groupId": this.newProject._id
      //   }
      // }
      // this.segment(segmentPageName, segmentTrackName,segmentTrackAttr);

      if (!isDevMode()) {
        if (window['analytics']) {
          try {
            window['analytics'].page("Wizard, Create project", {
            });
          } catch (err) {
            this.logger.error('Wizard Create project page error', err);
          }
          try {
            window['analytics'].identify(this.user._id, {
              name: this.user.firstname + ' ' + this.user.lastname,
              email: this.user.email,
              logins: 5,
              plan: "Scale (trial)"
            });
          } catch (err) {
            this.logger.error('Wizard Create project identify error', err);
          }
          try {
            window['analytics'].track('Trial Started', {
              "userId": this.user._id,
              "trial_start_date": trialStarDate,
              "trial_end_date": trialEndDate,
              "trial_plan_name": "Scale (trial)",
              "context": {
                "groupId": this.newProject._id
              }
            });
          } catch (err) {
            this.logger.error('Wizard Create track Trial Started event error', err);
          }
          try {
            window['analytics'].group(this.newProject._id, {
              name: this.newProject.name,
              plan: "Scale (trial)",
            });
          } catch (err) {
            this.logger.error('Wizard Create project group error', err);
          }
        }
      }
      // setTimeout(() => {
      //   if(auto == true){
      //     this.DISPLAY_SPINNER_SECTION = false;
      //   }
      //   this.DISPLAY_SPINNER = false;
      // }, 2000);
      this.getProjectsAndSaveInStorage();
      this.callback('createNewProject');
    });
  }


  /** 
   *  GET PROJECTS AND SAVE IN THE STORAGE: PROJECT ID - PROJECT NAME - USE ROLE   
   * */
  getProjectsAndSaveInStorage() {
    this.projectService.getProjects().subscribe((projects: any) => {
      // console.log('[WIZARD - CREATE-PRJCT] !!! getProjectsAndSaveInStorage PROJECTS ', projects);
      if (projects) {
        this.projects = projects;
        // SET THE IDs and the NAMES OF THE PROJECT IN THE LOCAL STORAGE.
        // WHEN IS REFRESHED A PAGE THE AUTSERVICE USE THE NAVIGATION PROJECT ID TO GET FROM STORAGE THE NAME OF THE PROJECT
        // AND THEN PUBLISH PROJECT ID AND PROJECT NAME
        this.projects.forEach(project => {
          // console.log('[WIZARD - CREATE-PRJCT] !!! getProjectsAndSaveInStorage SET PROJECT IN STORAGE')
          if (project.id_project) {
            const prjct: Project = {
              _id: project.id_project._id,
              name: project.id_project.name,
              role: project.role,
              operatingHours: project.id_project.activeOperatingHours
            }
            localStorage.setItem(project.id_project._id, JSON.stringify(prjct));
          }
        });
      } else {

      }
    }, error => {
      console.log('[WIZARD - CREATE-PRJCT] getProjectsAndSaveInStorage - ERROR ', error)
    }, () => {
      // console.log('[WIZARD - CREATE-PRJCT] getProjectsAndSaveInStorage - COMPLETE')
    });
  }


  // -----------------  FUNCTION CALLBACK   ------------------------ //
  callback(step:string, variable?: any){
    if(step === 'createNewProject'){
      this.createBot();
    }
    else if(step === 'createBot'){
      this.hookBotToDept(variable);
    }
    else if(step === 'hookBotToDept'){
      this.createDefaultFaqOnBot();
    }
    else if(step === 'uploadFaqFromCSV'){
      //this.goToNextStep();
      this.DISPLAY_SPINNER_SECTION = true;
      this.DISPLAY_SPINNER = false;



      // this.segmentAttributes["projectId"] = this.projectID;
      // this.segmentAttributes["projectName"] = this.projectName;
      // this.segmentAttributes["userId"] = this.user._id;
      // this.segmentAttributes["username"] = this.user.firstname + ' ' + this.user.lastname;
      // this.segmentAttributes["botId"] = this.botId;

      let segmentPageName = "Wizard, Onboarding";
      let segmentTrackName = "Onboarding";
      var segmentTrackAttr = {};
      segmentTrackAttr["projectId"] = this.projectID;
      segmentTrackAttr["projectName"] = this.projectName;
      segmentTrackAttr["userId"] = this.user._id;
      segmentTrackAttr["username"] = this.user.firstname + ' ' + this.user.lastname;
      segmentTrackAttr["botId"] = this.botId;
      // let segmentTrackAttr = this.segmentAttributes;
      this.segment(segmentPageName, segmentTrackName, segmentTrackAttr, this.segmentIdentifyAttributes);
      // this.DISPLAY_SPINNER_SECTION = false;
      // this.DISPLAY_BOT = true;
      this.goToExitOnboarding();
    }
  }
  // -----------------  FUNCTION CALLBACK   ------------------------ //



  segment(pageName, trackName, trackAttr, segmentIdentifyAttributes){
    // console.log('segment::: ', segmentIdentifyAttributes);
    if (!isDevMode()) {
      try {
        window['analytics'].page(pageName, {
        });
      } catch (err) {
        this.logger.error(pageName+' error', err);
      }
      try {
        window['analytics'].identify(this.user._id, {
          name: this.user.firstname + ' ' + this.user.lastname,
          email: this.user.email,
          logins: 5, 
          segmentIdentifyAttributes
        });
      } catch (err) {
        this.logger.error(pageName+' identify error', err);
      }
      try {
        window['analytics'].track(trackName, trackAttr);
      } catch (err) {
        this.logger.error(pageName+' track error', err);
      }
    }
  }

  // ----------------- 1 : CREATE A BOT ------------------------ // 
  createBot(){    
    // this.DISPLAY_BOT = true;
    this.DISPLAY_SPINNER_SECTION = true;
    let faqKbName = this.projectName;
    let faqKbUrl = '';
    let botType = 'tilebot';
    let bot_description = '';
    let language = this.translate.currentLang;
    let template = '';
    this.faqKbService.createFaqKb(faqKbName, faqKbUrl, botType, bot_description, language, template)
      .subscribe((faqKb) => {
        this.logger.log('[BOT-CREATE] CREATE FAQKB - RES ', faqKb);
        if (faqKb) {
          this.botId = faqKb['_id'];
          this.botLocalDbService.saveBotsInStorage(this.botId, faqKb);
          this.callback('createBot', this.botId);
        }
      }, (error) => {
        this.logger.error('[BOT-CREATE] CREATE FAQKB - POST REQUEST ERROR ', error);
        this.DISPLAY_SPINNER = false;
        this.CREATE_BOT_ERROR = true;
      }, () => {
        // console.log('[BOT-CREATE] CREATE FAQKB - POST REQUEST * COMPLETE *');
      });
  }

  // ----------------- 2 : GET DEFAULT DEPARTMENT OF THE PROJECT  ------------------------ // 
  getDeptsByProjectId(){
    this.departmentService.getDeptsByProjectId().subscribe((departments: any) => {
      if (departments && departments.length > 0) {
          const departmentId = departments[0]._id;
          this.callback('getDeptsByProjectId', departmentId);
      } else {
        this.DISPLAY_SPINNER = false;
        this.CREATE_BOT_ERROR = true;
      }     
    }, error => {
      this.logger.error('[BOT-CREATE --->  DEPTS RES - ERROR', error);
      this.DISPLAY_SPINNER = false;
      this.CREATE_BOT_ERROR = true;
    }, () => {
      // console.log('[BOT-CREATE --->  DEPTS RES - COMPLETE')
    });
  }


  // ----------------- 3 : ASSIGN BOT TO THE DEFAULT DEPARTMENT  ------------------------ //
  hookBotToDept(departmentId) {
    this.departmentService.updateExistingDeptWithSelectedBot(departmentId, this.botId).subscribe((res) => {
      // console.log('[TILEBOT] - UPDATE EXISTING DEPT WITH SELECED BOT - RES ', res);
      this.callback('hookBotToDept', res);
    }, (error) => {
      this.logger.error('[TILEBOT] - UPDATE EXISTING DEPT WITH SELECED BOT - ERROR ', error);
      this.DISPLAY_SPINNER = false;
      this.CREATE_BOT_ERROR = true;
    }, () => {
      // console.log('[TILEBOT] - UPDATE EXISTING DEPT WITH SELECED BOT * COMPLETE *');
    });
  }


  // ----------------- 4 : ADD START AND DEFAULTFALLBACK TO FAQ    ------------------------ //
  createDefaultFaqOnBot() {
    let answer = this.welcomeMessage;
    let intents = ['start','defaultFallback'];
    let questions = ['\\start','defaultFallback'];
    let answers = [answer,this.defaultFallback];
    this.uploadFaqFromCSV(questions, answers, intents);
  }

  // ----------------- 5 : ADD FAQ TO CHATBOT VIA CSV UPLOAD   ------------------------ //
  uploadFaqFromCSV(questions, answers, intents) {
    let csvColumnsDelimiter = ';'
    var csv = '';
    let buttons = '';
    for(let i=0;i<questions.length;i++) {
      let domanda = '"'+questions[i]+'";';
      let risposta = '"'+answers[i]+'";';
      let intent = '"'+intents[i]+'";';
      csv += domanda+risposta+';'+intent+'false'+'\r\n';
      buttons += "* "+questions[i]+"\n";
    }
    var myBlob = new Blob([csv], {type: "text/csv"});
    const formData: FormData = new FormData();
    formData.set('id_faq_kb', this.botId);
    formData.set('delimiter', csvColumnsDelimiter);
    formData.append('uploadFile', myBlob, 'csvFile');
    //formData.append('uploadFile', csvContent, 'nomeFile');
    //this.logger.log('FORM DATA ', formData)
    this.faqService.uploadFaqCsv(formData)
      .subscribe(data => {
        // console.log('uploadFaqCsv()::: ', data);
        // console.log('[TILEBOT] UPLOAD CSV DATA ', data);
        if (data['success'] === true) {
          // this.callback('uploadFaqCsv');
          this.callback('uploadFaqFromCSV');
        } else if (data['success'] === false) {
          this.DISPLAY_SPINNER = false;
          this.CREATE_FAQ_ERROR = true;
        }
      }, (error) => {
        this.logger.error('[TILEBOT] UPLOAD CSV - ERROR ', error);
        this.DISPLAY_SPINNER = false;
        this.CREATE_FAQ_ERROR = true;
      }, () => {
        // console.log('[TILEBOT] UPLOAD CSV * COMPLETE *');
        // setTimeout(() => {
        //   this.DISPLAY_SPINNER_SECTION = false;
        //   this.DISPLAY_SPINNER = false;
        // }, 2000);
      });
  }
}
