/*
Really wanted to have database load the data automatically (on startup) and store it in arrays which can be accessed by other functions
Don't want to have to have a line at the end of getProjectsFromDB which says 'send to projects' - want to do it in the other direction.

To make this work, it seems that firstly, all modules need to be IIFE - otherwise there is a referenceerror when having a reference to database or main before it has been read
(since it will be a circle of references, there is no way to order it properly)
IIFE solves this as long as nothing is run from the modules immediately (ie can't have the init() statement at the end of the module)

To run init(), have a MAIN function which calls them sequentially. 

Don't have MAIN run instantly, rather, run MAIN.init() at the end of the page or use ('DOMContentLoaded', init)

MAIN then can do await DATABASE.init(), before LAYOUT.init()

*/

// check if a user is logged in, by accessing sessionStorage
// sessionStorage is better than localStorage for this, because want to need to log in every time the page is accessed, but not after refresh/addition to database
const MAIN = (() => {
    function checkForLogin() {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');
        if (isLoggedIn == 'true') {
            init();
        } else {
            setUpLogin();
        }
    }

    async function setUpLogin() {
        await DATABASE.setUpLogin();
        LAYOUT.setUpLogin();
    }

    async function init() {
        // set the isLoggedIn flag so that Main will skip login on refresh (adding to database, pressing refresh button)
        sessionStorage.setItem('isLoggedIn', 'true');

        // retrieves data from the database and allows the corresponding arrays to be accessed by other functions
        await DATABASE.init();
        // On top of putting up the initial HTML, LAYOUT initializes other modules, simultaneously sending the parent node on which they should be appended to
        LAYOUT.init();
    }

    window.addEventListener('DOMContentLoaded', checkForLogin);

    return { setUpLogin, init };
})();

const DATABASE = (() => {
    let usersList = [];
    let username = '';
    let userProjectList = [];
    let userTodoList = [];
    let filteredTodoList = [];

    let filterSettings = { projectIndex: -1, dateIndex: 'all' };

    // get the usernames, retrieve the entered username
    async function setUpLogin() {
        await getUsernamesFromDB();
    }

    async function getUsernamesFromDB() {
        let uri = 'http://localhost:3000/usernames';
        const res = await fetch(uri);
        const usersData = await res.json();
        usersData.forEach((entry) => {
            usersList.push(entry.username);
        });
    }

    function getUsersList() {
        return usersList;
    }

    async function addUsernameToDB(newUsername) {
        const usernameEntry = { username: newUsername };
        let uri = 'http://localhost:3000/usernames';
        await fetch(uri, {
            method: 'POST',
            body: JSON.stringify(usernameEntry),
            headers: { 'Content-Type': 'application/json' },
        });
        setUsername(newUsername);
        MAIN.init();
    }

    function setUsername(logInUsername) {
        username = logInUsername;
        // required for remembering the username after refresh (storing data in the database/pressing refresh button)
        sessionStorage.setItem('username', username);
    }

    // get data specific to the entered user
    async function init() {
        console.log('DATABASE initializing');
        username = sessionStorage.getItem('username');

        await getProjectsFromDB();
        await getTodosFromDB();
        getFilterSettingsFromLocalStorage();
        filterTodoList();
    }

    async function getProjectsFromDB() {
        let uri = `http://localhost:3000/projects?username=${username}`;
        const res = await fetch(uri);
        //const userProjectList = await res.json();
        userProjectList = await res.json();
    }

    async function getTodosFromDB() {
        // uri will include the username entered on login
        let uri = `http://localhost:3000/todos?username=${username}`;
        const res = await fetch(uri);
        userTodoList = await res.json();
    }

    function getFilterSettingsFromLocalStorage() {
        const filterSettingsString = sessionStorage.getItem('filterSettings');
        if (!filterSettingsString) {
            console.log('using default filter settings');
            return;
        } else {
            filterSettings = JSON.parse(filterSettingsString);
        }
    }

    function filterTodoList() {
        // first, filter by project
        if (filterSettings.projectIndex != -1) {
            // prettier-ignore
            filteredTodoList = userTodoList.filter((todo) => todo.projectIndex == filterSettings.projectIndex);
        } else {
            filteredTodoList = userTodoList;
        }

        // then filter by date
        // prettier-ignore
        filteredTodoList = filterByDate(filteredTodoList, filterSettings.dateIndex);
    }

    function filterByDate(todoList, dateIndex) {
        // get strings for today's date and a date a week from today
        const today = todayPlusInterval(0);
        const oneWeek = todayPlusInterval(7);

        if (dateIndex === 'week') {
            todoList = todoList.filter((todo) => {
                if (todo.duedate < oneWeek && todo.duedate >= today) {
                    return true;
                }
            });
        } else if (dateIndex === 'day') {
            todoList = todoList.filter((todo) => {
                if (todo.duedate == today) {
                    return true;
                }
            });
        } else if (dateIndex === 'past') {
            todoList = todoList.filter((todo) => {
                if (todo.duedate < today) {
                    return true;
                }
            });
        }
        return todoList;
    }

    function todayPlusInterval(interval) {
        const today = new Date();
        let day = today.getDate();
        let month = today.getMonth() + 1;
        let year = today.getFullYear();

        const int = interval - 1;
        const thirtyDayMonths = [4, 6, 9, 11];

        if (month == '02' && day >= 28 - int) {
            day = day + interval - 28;
            month = month + 1;
        } else if (thirtyDayMonths.includes(month) && day >= 30 - int) {
            day = day + interval - 30;
            month = month + 1;
        } else if (day >= 31 - int && month == '12') {
            day = day + interval - 31;
            month = 1;
            year = year + 1;
        } else if (day >= 30 - int) {
            day = day + interval - 31;
            month = month + 1;
        } else {
            day = day + interval;
        }

        const padMonth = month.toString().padStart(2, 0);
        const padDay = day.toString().padStart(2, 0);
        const newDate = `${year}-${padMonth}-${padDay}`;

        return newDate;
    }

    function getUsername() {
        return username;
    }

    function getProjectList() {
        return userProjectList;
    }

    function getFilteredTodoList() {
        return filteredTodoList;
    }

    async function addProjectToDB(newProject) {
        let uri = `http://localhost:3000/projects`;
        await fetch(uri, {
            method: 'POST',
            body: JSON.stringify(newProject),
            headers: { 'Content-Type': 'application/json' },
        });
        filterSettings.projectIndex = newProject.projectIndex;
        setLocalStorageFilterSettings();
    }

    function getNewTodoIndex(projectIndex) {
        // prettier-ignore
        let currentTodoList = userTodoList.filter((todo) => todo.projectIndex == projectIndex);

        // need to sort to ensure that the largest todoIndex is in the last position in the array
        // prettier-ignore
        currentTodoList = currentTodoList.sort((a, b) => (a.todoIndex > b.todoIndex ? 1 : -1));

        if (!currentTodoList.length) {
            return 0;
        }

        // prettier-ignore
        const newTodoIndex = currentTodoList[currentTodoList.length - 1].todoIndex + 1;

        return newTodoIndex;
    }

    async function addNewTodoToDB(newTodo) {
        let uri = `http://localhost:3000/todos`;
        await fetch(uri, {
            method: 'POST',
            body: JSON.stringify(newTodo),
            headers: { 'Content-Type': 'application/json' },
        });

        sessionStorage.setItem('autoOpenFlag', true);
        sessionStorage.setItem('autoOpenTodo', JSON.stringify(newTodo));
    }

    async function deleteTodoFromDB(todoDBID) {
        let uri = `http://localhost:3000/todos/${todoDBID}`;
        await fetch(uri, { method: 'DELETE' });
    }

    async function saveEditedTodoToDB(editedTodo, todoDBID) {
        let uri = `http://localhost:3000/todos/${todoDBID}`;
        await fetch(uri, {
            method: 'PUT',
            body: JSON.stringify(editedTodo),
            headers: { 'Content-Type': 'application/json' },
        });

        sessionStorage.setItem('autoOpenFlag', true);
        sessionStorage.setItem('autoOpenTodo', JSON.stringify(editedTodo));
    }

    function changeProjectFilterSetting(projectFilterSetting) {
        filterSettings.projectIndex = projectFilterSetting;
        setLocalStorageFilterSettings();
        filterTodoList();
    }

    function changeDateFilterSetting(dateFilterSetting) {
        filterSettings.dateIndex = dateFilterSetting;
        setLocalStorageFilterSettings();
        filterTodoList();
    }

    function setLocalStorageFilterSettings() {
        const filterSettingsString = JSON.stringify(filterSettings);
        sessionStorage.setItem('filterSettings', filterSettingsString);
    }

    function getFilterSettings() {
        return filterSettings;
    }

    // need to find the DB id of all todos relevant to a particular project, because when it gets deleted, they should be removed as well.
    function getAssociatedTodoDBIDs(projectIndex) {
        // prettier-ignore
        const associatedTodoDBIDs = userTodoList
        .filter((todo) => todo.projectIndex == projectIndex)
        .map((todo) => todo.id);

        return associatedTodoDBIDs;
    }

    async function deleteProjectFromDB(projectDBID) {
        let uri = `http://localhost:3000/projects/${projectDBID}`;
        await fetch(uri, { method: 'DELETE' });
        filterSettings.projectIndex = -1;
        setLocalStorageFilterSettings();
        return true;
    }

    async function deleteAssociatedTodosFromDB(associatedTodoDBIDs) {
        for (todoID of associatedTodoDBIDs) {
            let uri = `http://localhost:3000/todos/${todoID}`;
            await fetch(uri, { method: 'DELETE' });
        }
    }

    return {
        setUpLogin,
        init,
        getUsersList,
        addUsernameToDB,
        setUsername,
        getUsername,
        getProjectList,
        getFilteredTodoList,
        addProjectToDB,
        getNewTodoIndex,
        addNewTodoToDB,
        deleteTodoFromDB,
        saveEditedTodoToDB,
        changeProjectFilterSetting,
        changeDateFilterSetting,
        getFilterSettings,
        getAssociatedTodoDBIDs,
        deleteProjectFromDB,
        deleteAssociatedTodosFromDB,
        // getUserTodoList,
    };
})();

const LAYOUT = (() => {
    let selectedView = 'list';

    const DOM = {
        body: document.querySelector('body'),
        display: undefined,
        viewOptionContainer: undefined,
        dateContainer: undefined,
        projectContainer: undefined,
        newProjectContainer: undefined,
        todoContainer: undefined,
        calendarContainer: undefined,
    };

    // login is just a blank layout, with no projects or todos. None of the 'buttons' have any functionality
    function setUpLogin() {
        renderLogInPage();
        LOGIN.init(DOM.display);
    }

    function renderLogInPage() {
        const dummyLayout = dummyLayoutHTML();
        DOM.body.insertAdjacentHTML('beforeend', dummyLayout);
        DOM.display = document.querySelector('#display');
    }

    // looks like a loaded layout, but has no functionality
    function dummyLayoutHTML() {
        let template = '';
        template += `<div id="full-container">
                        <div id="menu">
                            <div id="logoDiv">
                                <img class="bearImage" src="./Images/BearbeerCrop.png" />
                                <div id="bearText">Opie the Beer Bear</div>
                            </div>
                            <div id="view-option-container"></div>
                            <div id="date-container">
                                <div class="date-item selected-date" data-date="all">All</div>
                                <div class="date-item" data-date="week">7 days</div>
                                <div class="date-item" data-date="day">Today</div>
                                <div class="date-item" data-date="past">Past</div>
                            </div>
                            <div id="project-container"></div>
                            <div id="new-project-container">
                                <div id="new-project">New Project</div>
                            </div>
                        </div>
                        <div id="display">
                            <div id="todo-container">
                                <div id="new-todo">New Todo</div>
                            </div>
                        </div>
                    </div>`;
        return template;
    }

    // loads the real page, and initializes most of the modules by calling them and sending them the parent(or sibling) that they should be appended to
    function init() {
        console.log('LAYOUT initializing');

        DOM.body.replaceChildren('');

        appendLayout();
        assignDOM();

        getSelectedViewFromLocalStorage();
        console.log('selected view: ', selectedView);

        VIEWS.init(DOM.viewOptionContainer);
        DATES.init(DOM.dateContainer);
        NEWPROJECT.init(DOM.newProjectContainer);
        PROJECTS.init(DOM.projectContainer);
        HEADER.init(DOM.display);

        displayView();
    }

    function appendLayout() {
        const layout = layoutHTML();
        DOM.body.insertAdjacentHTML('beforeend', layout);
    }

    function layoutHTML() {
        let template = '';
        template += `
        <div id="full-container">

            <div id="menu">
                <div id="logoDiv">
                    <img class="bearImage" src="./Images/BearbeerCrop.png" />
                    <div id="bearText">Opie the Beer Bear</div>
                </div>

                <div id="view-option-container"></div>

                <div id="date-container">
                
                </div>

                <div id="project-container"></div>

                <div id="new-project-container"></div>
            </div>

            <div id="display">
                <div id="todo-container"></div>
                <div id="calendar-container"></div>

            </div>

        </div>`;
        return template;
    }

    function assignDOM() {
        // prettier-ignore
        DOM.display = document.querySelector('#display');
        // prettier-ignore
        DOM.viewOptionContainer = document.querySelector('#view-option-container');
        // prettier-ignore
        DOM.dateContainer = document.querySelector('#date-container');
        // prettier-ignore
        DOM.projectContainer = document.querySelector('#project-container');
        // prettier-ignore
        DOM.newProjectContainer = document.querySelector('#new-project-container');
        // prettier-ignore
        DOM.todoContainer = document.querySelector('#todo-container');
        // prettier-ignore
        DOM.calendarContainer = document.querySelector('#calendar-container');
    }

    function getSelectedViewFromLocalStorage() {
        const storedSelectedView = sessionStorage.getItem('selectedView');
        if (!storedSelectedView) {
            console.log('using default view (list)');
            return;
        } else {
            selectedView = storedSelectedView;
        }
    }

    // is there any benefit to this over just hiding the display of either one on click?
    function displayView() {
        DOM.display.children[1].replaceChildren();
        DOM.display.children[2].replaceChildren();

        if (selectedView == 'list') {
            NEWTODO.init(DOM.todoContainer);
            TODOS.init(DOM.todoContainer);
        } else {
            CALENDAR.init(DOM.calendarContainer);
        }
    }

    function getSelectedView() {
        return selectedView;
    }

    function changeSelectedView(clickedView) {
        selectedView = clickedView;
        sessionStorage.setItem('selectedView', selectedView);
        displayView();
    }

    return {
        setUpLogin,
        init,
        displayView,
        getSelectedView,
        changeSelectedView,
    };
})();

const VIEWS = (() => {
    const DOM = {
        viewOptionContainer: undefined,
        viewBtnNodeList: undefined,
    };

    function init(parentNode) {
        console.log('VIEWS initializing');
        DOM.viewOptionContainer = parentNode;

        renderViewBtns();
        bindViewBtns();
        setSelectedView();
    }

    function renderViewBtns() {
        const viewBtns = viewBtnsHTML();
        DOM.viewOptionContainer.insertAdjacentHTML('beforeend', viewBtns);
    }

    function viewBtnsHTML() {
        let template = '';
        template += `<div class="view-option selected-view" data-view="list">List View</div>
                    <div class="view-option" data-view="calendar">Calendar View</div>`;
        return template;
    }

    function bindViewBtns() {
        DOM.viewBtnNodeList = document.querySelectorAll('.view-option');

        DOM.viewBtnNodeList.forEach((button) => {
            button.addEventListener('click', clickViewBtn);
        });
    }

    function setSelectedView() {
        const selectedView = LAYOUT.getSelectedView();

        // prettier-ignore
        const selectedButton = document.querySelector(`[data-view="${selectedView}"]`);
        selectView(selectedButton);
    }

    function selectView(button) {
        // prettier-ignore
        document.querySelector('.selected-view').classList.remove('selected-view');
        button.classList.add('selected-view');
    }

    function clickViewBtn(event) {
        const selectedView = event.target.dataset.view;
        selectView(event.target);
        LAYOUT.changeSelectedView(selectedView);
    }

    return { init };
})();

const DATES = (() => {
    const DOM = {
        dateContainer: undefined,
        dateBtnNodeList: undefined,
    };

    function init(parentNode) {
        console.log('DATES initializing');
        DOM.dateContainer = parentNode;

        renderDateBtns();
        bindDateBtns();
        setSelectedDate();
    }

    function renderDateBtns() {
        const dateBtns = dateBtnsHTML();
        DOM.dateContainer.insertAdjacentHTML('beforeend', dateBtns);
    }

    function dateBtnsHTML() {
        let template = '';
        template += `
        <div class="date-item selected-date" data-date="all">All</div>
        <div class="date-item" data-date="week">7 days</div>
        <div class="date-item" data-date="day">Today</div>
        <div class="date-item" data-date="past">Past</div>`;
        return template;
    }

    function bindDateBtns() {
        DOM.dateBtnNodeList = document.querySelectorAll('.date-item');
        // prettier-ignore
        DOM.dateBtnNodeList.forEach((button) => {
            button.addEventListener('click', clickDateBtn);
        })
    }

    // get filtersettings from localstorage to recall & choose the selected date after a refresh (database entry, refresh button)
    function setSelectedDate() {
        const filterSettings = DATABASE.getFilterSettings();
        const filterDateIndex = filterSettings.dateIndex;
        // prettier-ignore
        const selectedButton = document.querySelector(`[data-date="${filterDateIndex}"]`);
        selectDate(selectedButton);
    }

    function selectDate(button) {
        // prettier-ignore
        document.querySelector('.selected-date').classList.remove('selected-date');
        button.classList.add('selected-date');
    }

    function clickDateBtn(event) {
        dateFilterSetting = event.target.dataset.date;
        selectDate(event.target);
        DATABASE.changeDateFilterSetting(dateFilterSetting);
        // display either Todos or Calendar with the new filter setting
        LAYOUT.displayView();
    }

    return { init };
})();

const PROJECTS = (() => {
    let userProjectList = [];

    const DOM = {
        projectContainer: undefined,

        projectBtnNodeList: undefined,
        projectDelBtnNodeList: undefined,
    };

    // retrieve and set up the project fitler buttons
    function init(parentNode) {
        console.log('PROJECTS initializing');
        DOM.projectContainer = parentNode;
        userProjectList = DATABASE.getProjectList();

        renderProjects();
        bindProjectBtns();
        bindProjectDelBtns();
        setSelectedProject();
    }

    function renderProjects() {
        const allProjectBtn = allProjectBtnHTML();
        // prettier-ignore
        DOM.projectContainer.insertAdjacentHTML('beforeend', allProjectBtn);
        userProjectList.forEach((project) => {
            const projectBtn = projectBtnHTML(project);
            // prettier-ignore
            DOM.projectContainer.insertAdjacentHTML('beforeend', projectBtn);
        });
    }

    function allProjectBtnHTML() {
        let template = '';
        template += `<div class="proj-button-container" data-project="-1">
                        <div class="project selected-project" data-project="-1">All</div>
                        </div>`;
        return template;
    }

    function projectBtnHTML(project) {
        let template = '';
        template += `<div class="proj-button-container" data-project=${project.projectIndex}>
                        <div class="project" data-project=${project.projectIndex}>${project.projectName}</div>
                            <div class="proj-del-button" data-project=${project.projectIndex}>✘</div>
                        </div>`;
        return template;
    }

    function bindProjectBtns() {
        DOM.projectBtnNodeList = document.querySelectorAll('.project');
        DOM.projectBtnNodeList.forEach((button) => {
            button.addEventListener('click', clickProjectBtn);
        });
    }

    function bindProjectDelBtns() {
        DOM.projectDelBtnNodeList =
            document.querySelectorAll('.proj-del-button');
        DOM.projectDelBtnNodeList.forEach((button) => {
            button.addEventListener('click', clickProjectDelBtn);
        });
    }

    // get filtersettings from localstorage to recall & choose the selected project after a refresh (database entry, refresh button)
    function setSelectedProject() {
        const filterSettings = DATABASE.getFilterSettings();
        const filterProjectIndex = filterSettings.projectIndex;
        // prettier-ignore
        const selectedButton = document.querySelector(`[data-project="${filterProjectIndex}"]`);
        selectProject(selectedButton);
    }

    function selectProject(button) {
        // prettier-ignore
        document.querySelector('.selected-project').classList.remove('selected-project');
        button.classList.add('selected-project');
    }

    // result of clicking a project button
    function clickProjectBtn(event) {
        projectFilterSetting = event.target.dataset.project;
        selectProject(event.target);

        DATABASE.changeProjectFilterSetting(projectFilterSetting);
        // display either Todos or Calendar with the new filter setting
        LAYOUT.displayView();
    }

    // result of clicking a delete todo button
    async function clickProjectDelBtn(event) {
        const projectIndex = event.target.dataset.project;
        console.log(projectIndex);

        // find projectID of the project to remove
        const projectDBID = getClickedProjectDBID(projectIndex);

        // find the todo.id of all todos with the corresponding projectIndex
        const associatedTodoDBIDs =
            DATABASE.getAssociatedTodoDBIDs(projectIndex);

        console.log(projectDBID, associatedTodoDBIDs);

        // await deleting the project using projectid
        const deleteSuccess = await DATABASE.deleteProjectFromDB(projectDBID);

        // delete the associated todos using todoid
        if (deleteSuccess) {
            DATABASE.deleteAssociatedTodosFromDB(associatedTodoDBIDs);
        }
    }

    function getClickedProjectDBID(projectIndex) {
        // prettier-ignore
        const clickedProjectData = userProjectList.find((project) => project.projectIndex == projectIndex);
        return clickedProjectData.id;
    }

    return { init, DOM };
})();

const NEWPROJECT = (() => {
    const DOM = {
        newProjectContainer: undefined,
        newProjectBtn: undefined,
        inputProjectField: undefined,

        projectContainer: undefined, // part of PROJECTS module but want to use it
    };

    // setting up the new project button
    function init(newProjectContainer) {
        console.log('NEWPROJECT initializing');
        DOM.newProjectContainer = newProjectContainer;

        renderNewProject();
        bindNewProject();
    }

    function renderNewProject() {
        const newProjectBtn = newProjectBtnHTML();
        DOM.newProjectContainer.insertAdjacentHTML('beforeend', newProjectBtn);
    }

    function newProjectBtnHTML() {
        let template = '';
        template += `<div id="new-project">New Project</div>`;
        return template;
    }

    function bindNewProject() {
        DOM.newProjectBtn = document.querySelector('#new-project');
        DOM.newProjectBtn.addEventListener('click', clickNewProjectBtn);
    }

    // the result of clicking the new project button
    function clickNewProjectBtn() {
        renderInputProjectField();

        bindInputProjectField();
        DOM.inputProjectField.focus();
    }

    function renderInputProjectField() {
        // need to borrow projectContainer from PROJECTS to append the input field
        DOM.projectContainer = PROJECTS.DOM.projectContainer;

        const inputProjectField = inputProjectFieldHTML();
        DOM.projectContainer.insertAdjacentHTML('beforeend', inputProjectField);
    }

    function bindInputProjectField() {
        DOM.inputProjectField = document.querySelector('.proj-input-field');
        // prettier-ignore
        DOM.inputProjectField.addEventListener('keypress', pressEnterInputProjectField);

        // this will cancel entering a new project if other buttons are clicked
        window.addEventListener('mouseup', cancelInputProjectByClick);
    }

    function inputProjectFieldHTML() {
        let template = '';
        template += `<div class="proj-button-container">
                        <div class="proj-input-field" contenteditable="true"</div></div>`;
        return template;
    }

    // the result of clicking other buttons during entering a new project in the input project field
    function cancelInputProjectByClick(event) {
        if (event.target != DOM.inputProjectField) {
            window.removeEventListener('mouseup', cancelInputProjectByClick);
            DOM.inputProjectField.remove();
        }
    }

    // the result of pressing keys in the input project field
    function pressEnterInputProjectField(event) {
        if (event.key === 'Enter') {
            if (!DOM.inputProjectField.textContent) {
                DOM.inputProjectField.remove();
            } else {
                runImportNewProject();
            }
        }
    }

    function runImportNewProject() {
        const newProject = getNewProjectData();
        DATABASE.addProjectToDB(newProject);
    }

    function getNewProjectData() {
        const currentUser = DATABASE.getUsername();
        const newProject = {
            username: currentUser,
            projectName: DOM.inputProjectField.textContent,
            projectIndex: getNewProjectIndex(),
        };
        return newProject;
    }

    function getNewProjectIndex() {
        let newProjectIndex = undefined;
        const projectList = DATABASE.getProjectList();

        if (!projectList.length) {
            newProjectIndex = 0;
        } else {
            // take the projectIndex of the final entry in the list, and add one to it.
            // makes it so even if deletions create gaps in projectIndex, it will always create a unique one
            newProjectIndex =
                projectList[projectList.length - 1].projectIndex + 1;
        }
        return newProjectIndex;
    }

    return { init };
})();

const NEWTODO = (() => {
    const DOM = {
        todoContainer: undefined,
        newTodoBtn: undefined,

        newTodoHeader: undefined,
        newTodoData: undefined,
        newTodoProjectDropdown: undefined,
        newTodoSubmitBtn: undefined,
    };

    // setting up the new todo button
    function init(parentNode) {
        console.log('NEWTODO initializing');
        DOM.todoContainer = parentNode;

        renderNewTodoBtn();
        bindNewTodoBtn();
    }

    function renderNewTodoBtn() {
        const newTodoBtn = newTodoBtnHTML();
        DOM.todoContainer.insertAdjacentHTML('beforeend', newTodoBtn);
    }

    function newTodoBtnHTML() {
        let template = '';
        template += `<div id="new-todo">New Todo</div>`;
        return template;
    }

    function bindNewTodoBtn() {
        DOM.newTodoBtn = document.querySelector('#new-todo');
        DOM.newTodoBtn.addEventListener('click', clickNewTodoBtn);
    }

    // the result of clicking the new todo button
    function clickNewTodoBtn() {
        renderNewTodoInputFields();
        populateProjectDropdown();
        bindSubmitNewTodo();
    }

    function renderNewTodoInputFields() {
        TODOS.refreshTodoPage();
        DOM.newTodoBtn.remove();

        const todoHeaderInput = todoHeaderInputHTML();
        DOM.todoContainer.insertAdjacentHTML('afterbegin', todoHeaderInput);
        DOM.newTodoHeader = document.querySelector('#new-todo');

        const todoDataInput = todoDataInputHTML();
        DOM.newTodoHeader.insertAdjacentHTML('afterend', todoDataInput);

        DOM.newTodoData = document.querySelector('.open-todo-data');
        // prettier-ignore
        DOM.newTodoProjectDropdown = document.querySelector('#project-dropdown')

        document.querySelector('.todo-name').style.pointerEvents = 'auto'; // need to do this to allow clicking on the input field
    }

    function todoHeaderInputHTML() {
        let template = '';

        template += `<div id="new-todo" class="input-new-container">
                        <div class="todo-name submit-todo-name todo-input-field" contenteditable="true" data-placeholder="New Todo"></div>
                        <div class="todo-date"></div>
                        <input type="date" id="date-input-field" class="todo-input-field submit-todo-duedate"></input>
                    </div>`;
        return template;
    }

    function todoDataInputHTML() {
        let template = '';

        template += `<div class="open-todo">
                        <div class="open-todo-data">
                            <div class="todo-desc submit-todo-desc todo-input-field" contenteditable="true" data-placeholder="Description:"></div>
                            <div class="todo-notes submit-todo-notes todo-input-field" contenteditable="true" data-placeholder="Notes:"></div>
                            <select id="project-dropdown" required>
                                <option class="dropdown-option" value="disabled">Choose project: </option>
                            </select>
                        </div>
                        <div class="todo-submit-button">✔</div>
                    </div>`;

        return template;
    }

    function populateProjectDropdown() {
        const projectList = DATABASE.getProjectList();

        projectList.forEach((project) => {
            const projectOption = projectOptionHTML(project);
            // prettier-ignore
            DOM.newTodoProjectDropdown.insertAdjacentHTML('beforeend',projectOption);
        });

        DOM.newTodoProjectDropdown.required = true;

        DOM.newTodoProjectDropdown.children[0].selected = true;
        DOM.newTodoProjectDropdown.children[0].value = '';
        DOM.newTodoProjectDropdown.children[0].disabled = true;

        /*
        // Auto-select the current project (if not All)
        // only works when projectIndexes are in order from 1 ...
        const projectIndex = Menu.getFilterSettings().projectIndex;
        if (projectIndex > -1) {
            DOM.$projectDropdown.selectedIndex = parseInt(projectIndex) + 1;
        }
        */
    }

    function projectOptionHTML(project) {
        let template = '';
        template += `<option class="dropdown-option" value="${project.projectIndex}">${project.projectName}</option>`;
        return template;
    }

    function bindSubmitNewTodo() {
        DOM.newTodoSubmitBtn = document.querySelector('.todo-submit-button');
        DOM.newTodoSubmitBtn.addEventListener('click', getNewTodoData);
    }

    // the result of clicking the submit data button
    function getNewTodoData() {
        const currentUser = DATABASE.getUsername();
        const projectIndex = DOM.newTodoProjectDropdown.selectedIndex - 1;
        const newTodoIndex = DATABASE.getNewTodoIndex(projectIndex);

        const newTodo = {
            username: currentUser,
            projectIndex: projectIndex,
            name: DOM.newTodoHeader.children[0].textContent,
            duedate: DOM.newTodoHeader.children[2].value,
            desc: DOM.newTodoData.children[0].textContent,
            notes: DOM.newTodoData.children[1].textContent,
            todoIndex: newTodoIndex,
        };

        DATABASE.addNewTodoToDB(newTodo);
    }

    return { init };
})();

const TODOS = (() => {
    let userTodoList = [];

    const DOM = {
        todoContainer: undefined, // parent of all todos including 'new'

        todoNodeList: undefined, // a node list of all todo buttons

        currentTodo: undefined,
        openTodo: undefined,

        todoDelBtnNodeList: undefined,
    };

    // retrieve and set up the todos
    function init(parentNode) {
        console.log('TODOS initializing');

        // a parentNode is only sent when the page is first loaded. No need to clear the container/run NEWTODO.init()
        // changing the project or date filter setting will call init() with no parent node.
        if (parentNode) {
            DOM.todoContainer = parentNode;
        } else {
            DOM.todoContainer.replaceChildren('');
            NEWTODO.init(DOM.todoContainer);
        }

        userTodoList = DATABASE.getFilteredTodoList();

        formatTodos();
        renderTodos();
        bindTodoBtns();
        bindTodoDelBtns();
        autoOpenTodoAfterDBEntry();
    }

    // ** runs a variety of functions that modify the todoList retrieved from the database, giving cleaner dates & colour-coding **
    function formatTodos() {
        if (userTodoList.length === 0) {
            return;
        }
        sortTodosByDate();
        flagDateColourCoding();
        alterDateToBePretty();
    }

    function sortTodosByDate() {
        userTodoList = userTodoList.sort((a, b) =>
            a.duedate > b.duedate ? 1 : -1
        );
    }

    function flagDateColourCoding() {
        const dateToday = todayPlusInterval(0);
        const dateTomorrow = todayPlusInterval(1);
        const dateDayAfterTomorrow = todayPlusInterval(2);
        userTodoList.forEach((todo) => {
            // Flag certain todo dates for text and colour alterations
            if (todo.duedate == dateToday) {
                todo.dateFlag = 'Today';
            } else if (todo.duedate == dateTomorrow) {
                todo.dateFlag = 'Tomorrow';
            } else if (todo.duedate == dateDayAfterTomorrow) {
                todo.dateFlag = 'DayAfterTomorrow';
            } else if (todo.duedate < dateToday) {
                todo.dateFlag = 'Past';
            }
        });
    }

    function todayPlusInterval(interval) {
        const today = new Date();
        let day = today.getDate();
        let month = today.getMonth() + 1;
        let year = today.getFullYear();

        const int = interval - 1;
        const thirtyDayMonths = [4, 6, 9, 11];

        if (month == '02' && day >= 28 - int) {
            day = day + interval - 28;
            month = month + 1;
        } else if (thirtyDayMonths.includes(month) && day >= 30 - int) {
            day = day + interval - 30;
            month = month + 1;
        } else if (day >= 31 - int && month == '12') {
            day = day + interval - 31;
            month = 1;
            year = year + 1;
        } else if (day >= 30 - int) {
            day = day + interval - 31;
            month = month + 1;
        } else {
            day = day + interval;
        }

        const padMonth = month.toString().padStart(2, 0);
        const padDay = day.toString().padStart(2, 0);
        const newDate = `${year}-${padMonth}-${padDay}`;

        return newDate;
    }

    function alterDateToBePretty() {
        // prettier-ignore
        userTodoList.forEach((todo) => {todo.prettyduedate = prettifyDate(todo.duedate)});
    }

    function prettifyDate(dateString) {
        const splitString = dateString.split('-');
        const year = splitString[0].slice(2, 4);
        // prettier-ignore
        const monthCode = [
            'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', ];
        let month = splitString[1];
        month = monthCode[parseInt(month)];
        const day = splitString[2];
        const newString = `${day} ${month}\u00A0\u00A0'${year}`;
        return newString;
    }
    // ** end of cleaning up the dates **

    function renderTodos() {
        userTodoList.forEach((todo) => {
            let todoBtn = undefined;
            if (todo.dateFlag) {
                todoBtn = todoBtnDateFlagHTML(todo);
            } else {
                todoBtn = todoBtnHTML(todo);
            }
            // prettier-ignore
            DOM.todoContainer.insertAdjacentHTML('beforeend', todoBtn);
        });
    }

    function todoBtnHTML(todo) {
        let template = '';
        template += `<div class="todo" data-todo=${todo.todoIndex} data-project=${todo.projectIndex}>
                        <div class="todo-name">${todo.name}</div>
                        <div class="todo-date">${todo.duedate}</div>
                        <div class="todo-del-button" data-todo=${todo.todoIndex} data-project=${todo.projectIndex}>✘</div>
                        </div>`;
        return template;
    }

    function todoBtnDateFlagHTML(todo) {
        // Want to display 'Today', 'Tomorrow' and 'Day After Tomorrow' with colourcoding.
        // 'Past' should be the date, just greyed out
        let template = '';

        template += `<div class="todo" data-todo=${todo.todoIndex} data-project=${todo.projectIndex}><div class="todo-name">${todo.name}</div>`;

        if (todo.dateFlag === 'Past') {
            template += `<div class="todo-date date-${todo.dateFlag}">${todo.prettyduedate}</div>`;
        } else if (todo.dateFlag === 'DayAfterTomorrow') {
            template += `<div class="todo-date date-${todo.dateFlag}">Day After Tomorrow</div>`;
        } else {
            template += `<div class="todo-date date-${todo.dateFlag}">${todo.dateFlag}</div>`;
        }
        template += `<div class="todo-del-button" data-todo=${todo.todoIndex} data-project=${todo.projectIndex}>✘</div></div>`;

        return template;
    }

    function bindTodoBtns() {
        DOM.todoNodeList = document.querySelectorAll('.todo');
        DOM.todoNodeList.forEach((button) => {
            button.addEventListener('click', clickTodoBtn);
        });
    }

    function bindTodoDelBtns() {
        // prettier-ignore
        DOM.todoDelBtnNodeList = document.querySelectorAll('.todo-del-button');
        DOM.todoDelBtnNodeList.forEach((button) => {
            button.addEventListener('click', clickTodoDelBtn);
        });
    }

    /* result of clicking a todo:
        record the button pressed
        locate the todo in the todolist based on its projectindex and todoindex (stored as dataset in the todo button)
        re-render the page, which will close it if it were already open.
        otherwise, open it by adding an openTodo element which contains all the data to be displayed.
        set up the todo edit button
    */

    function clickTodoBtn(event) {
        const projectIndex = event.target.dataset.project;
        const todoIndex = event.target.dataset.todo;
        const clickedTodoData = getClickedTodoData(projectIndex, todoIndex);
        const clickedTodo = event.target;

        refreshTodoPage();

        // If true, the todo that was clicked had the data open. It will close after refreshTodoPage, so stop the function should stop here.
        if (clickedTodo.classList.contains('current-todo')) {
            return;
        }

        // can't use event.target for the button pressed, since the todos are re-rendered and thus is considered a different instance of the element
        // prettier-ignore
        const todoButton = document.querySelector(`[data-todo="${todoIndex}"][data-project="${projectIndex}"]`)

        renderTodoData(todoButton, clickedTodoData);
    }

    function getClickedTodoData(projectIndex, todoIndex) {
        const clickedTodoData = userTodoList
            .filter((todo) => todo.projectIndex == projectIndex)
            .find((todo) => todo.todoIndex == todoIndex);
        return clickedTodoData;
    }

    // rather than messing around with checking for / adding and removing classes after todos are clicked/set for editing/new, re-rendering seems simpler/neater
    function refreshTodoPage() {
        DOM.todoContainer.replaceChildren('');
        NEWTODO.init(DOM.todoContainer);

        // could just run init() here, but not necessary to refresh userTodoList. Therefore can skip running formatTodos()
        renderTodos();
        bindTodoBtns();
        bindTodoDelBtns();
    }

    function renderTodoData(todoButton, todoData) {
        todoButton.classList.add('current-todo');
        const openTodo = openTodoHTML(todoData);
        todoButton.insertAdjacentHTML('afterend', openTodo);

        DOM.currentTodo = document.querySelector('.current-todo');
        DOM.openTodo = document.querySelector('.open-todo');

        EDITTODO.init(DOM.openTodo, todoData);
    }

    function openTodoHTML(todo) {
        let template = '';
        template += `<div class="open-todo">
                        <div class="open-todo-data">
                            <div class="todo-data">${todo.desc}</div>
                            <div class="todo-data">${todo.notes}</div>
                        </div>
                    </div>`;
        return template;
    }

    function autoOpenTodoAfterDBEntry() {
        // check to see if a todo has just been added or edited via sessionStorage ('true' or 'false')
        const autoOpenFlag = sessionStorage.getItem('autoOpenFlag');
        if (autoOpenFlag == 'true') {
            // prettier-ignore
            const autoOpenTodo = JSON.parse(sessionStorage.getItem('autoOpenTodo'));

            const currentTodo = document.querySelector(
                `[data-todo="${autoOpenTodo.todoIndex}"][data-project="${autoOpenTodo.projectIndex}"]`
            );
            renderTodoData(currentTodo, autoOpenTodo);
        }
        sessionStorage.setItem('autoOpenFlag', false);
    }

    // result of clicking a delete todo button
    function clickTodoDelBtn(event) {
        const projectIndex = event.target.dataset.project;
        const todoIndex = event.target.dataset.todo;

        const delTodo = getClickedTodoData(projectIndex, todoIndex);

        DATABASE.deleteTodoFromDB(delTodo.id);
    }

    return { init, DOM, refreshTodoPage };
})();

const EDITTODO = (() => {
    let todoData = {};

    const DOM = {
        editTodoHeader: undefined,
        editTodoData: undefined,
        editTodoButton: undefined,

        submitEditTodoButton: undefined,
    };

    // set up the edit button
    function init(parentNode, editTodo) {
        console.log('EDITTODO initializing');
        todoData = editTodo;

        const editTodoBtn = editTodoBtnHTML();
        parentNode.insertAdjacentHTML('beforeend', editTodoBtn);
        bindEditTodoBtn();
    }

    function editTodoBtnHTML() {
        let template = '';
        template += `<div class="todo-edit-button" data-todo=${todoData.todoIndex} data-project=${todoData.projectIndex}>E</div>`;
        return template;
    }

    function bindEditTodoBtn() {
        DOM.editTodoButton = document.querySelector('.todo-edit-button');
        DOM.editTodoButton.addEventListener('click', clickEditTodoBtn);
    }

    // result of clicking the edit todo button
    // rather than modifiying the current open todo in a messy way, create a mimic of it and insert it next to the existing one
    // remove the original version
    // set up the submit edited data button
    function clickEditTodoBtn() {
        const editTodoHeader = editTodoHeaderHTML();
        TODOS.DOM.currentTodo.insertAdjacentHTML('afterend', editTodoHeader);

        const editTodoData = editTodoDataHTML();
        TODOS.DOM.openTodo.insertAdjacentHTML('afterend', editTodoData);

        TODOS.DOM.openTodo.remove();
        TODOS.DOM.currentTodo.remove();

        DOM.editTodoHeader = document.querySelector('.current-edit-header');
        DOM.editTodoData = document.querySelector('.open-todo-data');

        bindSubmitEditTodoBtn();
    }

    function editTodoHeaderHTML() {
        let template = '';
        template += `<div class="todo current-todo current-edit-header">
                        <div class="todo-name todo-edit-field" style="pointer-events: auto;" contenteditable="true">${todoData.name}</div>
                        <div class="todo-date date-Past"></div>
                        <input type="date" id="date-input-field" class="todo-input-field" value=${todoData.duedate}>
                    </div>`;
        return template;
    }

    function editTodoDataHTML() {
        let template = '';
        template += `<div class="open-todo">
                <div class="open-todo-data">
                    <div class="todo-data todo-edit-field" contenteditable="true">${todoData.desc}</div>
                    <div class="todo-data todo-edit-field" contenteditable="true">${todoData.notes}</div>
                </div>
                <div class="todo-submit-button">✔</div>
            </div>`;
        return template;
    }

    function bindSubmitEditTodoBtn() {
        // prettier-ignore
        DOM.submitEditTodoButton = document.querySelector('.todo-submit-button')
        // prettier-ignore
        DOM.submitEditTodoButton.addEventListener('click',clickSubmitEditTodoButton);
    }

    // result of clicking the submit button in the edit panel
    function clickSubmitEditTodoButton() {
        const editedTodo = {
            username: todoData.username,
            projectIndex: todoData.projectIndex,
            name: DOM.editTodoHeader.children[0].textContent,
            duedate: DOM.editTodoHeader.children[2].value,
            desc: DOM.editTodoData.children[0].textContent,
            notes: DOM.editTodoData.children[1].textContent,
            todoIndex: todoData.todoIndex,
        };

        DATABASE.saveEditedTodoToDB(editedTodo, todoData.id);
    }

    return { init };
})();

const LOGIN = (() => {
    let usersList = [];

    const DOM = {
        display: undefined,
        usernameInput: undefined,
    };

    function init(parentNode) {
        console.log('LOGIN initializing');

        DOM.display = parentNode;
        usersList = DATABASE.getUsersList();

        renderLoginHeader();
        bindEnterUsername();

        DOM.usernameInput.focus();
    }

    function renderLoginHeader() {
        const loginHeader = loginHeaderHTML();
        DOM.display.insertAdjacentHTML('afterbegin', loginHeader);
        DOM.usernameInput = document.querySelector('.login-input-field');
    }

    function loginHeaderHTML() {
        let template = '';
        template += `<div id="header">
                        <div class="header-message">Enter Username:</div>
                        <input type="text" class="login-input-field" placeholder="Note: Log in as Default to generate data with dynamic due dates"/>
                    </div>`;
        return template;
    }

    function bindEnterUsername() {
        DOM.usernameInput.addEventListener('keypress', enterUsername);
    }

    // result of pressing enter in the usernameInput field
    function enterUsername(event) {
        if (event.key === 'Enter') {
            if (!DOM.usernameInput.value) {
                return;
            } else {
                let username = DOM.usernameInput.value;
                username = username.toLowerCase();
                checkForDefault(username);
            }
        }
    }

    function checkForDefault(username) {
        if (username == 'Default' || username == 'default') {
            DEFAULT.init(username);
        } else {
            checkIfNewUser(username);
        }
    }

    function checkIfNewUser(username) {
        if (!usersList.includes(username)) {
            console.log('new user!');
            DATABASE.addUsernameToDB(username);
        } else {
            console.log('I know you');
            DATABASE.setUsername(username);
            MAIN.init();
        }
    }

    return { init };
})();

const HEADER = (() => {
    let username = '';

    DOM = {
        display: undefined,

        logoutBtn: undefined,
    };

    function init(parentNode) {
        DOM.display = parentNode;
        username = DATABASE.getUsername();
        username = capitalizeUsername();
        renderHeader();
        bindLogoutBtn();
    }

    function capitalizeUsername() {
        const capUsername =
            username.charAt(0).toUpperCase() + username.slice(1);
        return capUsername;
    }

    function renderHeader() {
        const header = headerHTML();
        DOM.display.insertAdjacentHTML('afterbegin', header);

        DOM.logoutBtn = document.querySelector('.logout-button');
    }

    function headerHTML() {
        let template = '';
        template += `<div id="header">
                        <div class="header-message">Welcome, ${username}!</div>
                        <button class="logout-button">LOG OUT</button>
                    </div>`;
        return template;
    }

    function bindLogoutBtn() {
        DOM.logoutBtn.addEventListener('click', clickLogoutBtn);
    }

    function clickLogoutBtn() {
        // window.location.href = 'index.html'; vs MAIN.setUpLogin(); - any difference?
        // just don't need to expose MAIN.setUpLogin() ?
        // One liekly issue is that all the variables in the modules will remain, will probably need to clear various things.
        sessionStorage.setItem('isLoggedIn', 'false');

        // need to reset sessionStorage filterSettings for the case where a new login on the same session doesn't have the previous projectIndex
        const filterSettings = { projectIndex: -1, dateIndex: 'all' };
        const filterSettingsString = JSON.stringify(filterSettings);
        sessionStorage.setItem('filterSettings', filterSettingsString);

        window.location.href = 'index2.html';
    }

    return { init };
})();

const DEFAULT = (() => {
    // Get the full list of projects and todos with the username 'default', to get their ids
    // Then delete them all. This will ensure that if any extra have been created, they will be removed also.
    async function init(username) {
        console.log('DEFAULT initializing');

        const projectData = await retrieveDefaultProjectList(username);
        if (projectData) {
            await deleteProjectData(projectData);
        }

        const todoData = await retrieveDefaultTodoList(username);
        if (todoData) {
            await deleteTodoData(todoData);
        }

        RANDOMDATA.init();

        await addDefaultProjectListToDB(username);
        await addDefaultTodoListToDB(username);

        DATABASE.setUsername(username);
        MAIN.init();

        //window.location.href = 'index2.html';
    }

    async function retrieveDefaultProjectList(username) {
        let uri = `http://localhost:3000/projects?username=${username}`;
        const res = await fetch(uri);
        const projectData = await res.json();
        if (projectData.length > 0) {
            return projectData;
        } else {
            return false;
        }
    }

    async function deleteProjectData(projectData) {
        for (let project of projectData) {
            let uri = `http://localhost:3000/projects/${project.id}`;
            const res = await fetch(uri, { method: 'DELETE' });
        }
    }

    async function retrieveDefaultTodoList(username) {
        let uri = `http://localhost:3000/todos?username=${username}`;
        const res = await fetch(uri);
        const todoData = await res.json();
        if (todoData.length > 0) {
            return todoData;
        } else {
            return false;
        }
    }

    async function deleteTodoData(todoData) {
        for (let todo of todoData) {
            let uri = `http://localhost:3000/todos/${todo.id}`;
            const res = await fetch(uri, { method: 'DELETE' });
        }
    }

    async function addDefaultProjectListToDB(username) {
        const projectList = RANDOMDATA.makeProjectList(username);
        for (let project of projectList) {
            let uri = 'http://localhost:3000/projects';
            await fetch(uri, {
                method: 'POST',
                body: JSON.stringify(project),
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }

    async function addDefaultTodoListToDB(username) {
        const todoList = RANDOMDATA.makeTodoList(username);
        for (let todo of todoList) {
            let uri = 'http://localhost:3000/todos';
            await fetch(uri, {
                method: 'POST',
                body: JSON.stringify(todo),
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return true;
    }

    return { init };
})();

const RANDOMDATA = (() => {
    let defaultDates = [];

    function init() {
        console.log('RANDOMDATA initialzing');
        createDefaultDates();
    }

    function makeProjectList(username) {
        const projectList = [
            {
                username: username,
                projectName: 'Lab Duties',
                projectIndex: 0,
            },
            {
                username: username,
                projectName: 'Catalysis',
                projectIndex: 1,
            },
        ];
        return projectList;
    }

    function makeTodoList(username) {
        const todoList = [
            {
                username: username,
                projectIndex: 1,
                name: 'Mitsunobu reaction',
                desc: 'Book 7 page 12',
                duedate: defaultDates[0],
                notes: "Didn't run under nitrogen last time and it was still fine. Repeat reaction to make more starting material",
                todoIndex: 0,
            },
            {
                username: username,
                projectIndex: 0,
                name: 'Waste Disposal',
                desc: 'By 10:00 at the latest',
                duedate: defaultDates[1],
                notes: 'Take down the TLC plates too',
                todoIndex: 0,
            },
            {
                username: username,
                projectIndex: 1,
                name: 'Wash glassware',
                desc: 'Do the syringe needles top',
                duedate: defaultDates[2],
                notes: "Make sure to put in the oven in preparation for tomorrow's reaction",
                todoIndex: 1,
            },
            {
                username: username,
                projectIndex: 0,
                name: 'Waste Solvent Disposal',
                desc: '10:00 at the lobby',
                duedate: defaultDates[3],
                notes: 'Make sure to bring back some empty carboys (if available)',
                todoIndex: 1,
            },
            {
                username: username,
                projectIndex: 1,
                name: 'BCl3/AlCl3 reaction',
                desc: 'Book 7 page 10',
                duedate: defaultDates[4],
                notes: 'Enough material for a 1g scale reaction',
                todoIndex: 2,
            },
            {
                username: username,
                projectIndex: 0,
                name: 'Liquid Nitrogen',
                desc: 'Take it from floor 3 when it arrives',
                duedate: defaultDates[5],
                notes: 'Asada has been doing freeze-pump-thaw cycles recently, so need to fill it to the brim',
                todoIndex: 2,
            },
            {
                username: username,
                projectIndex: 1,
                name: 'Sonogashira coupling',
                desc: 'Book 7 page 11',
                duedate: defaultDates[6],
                notes: 'Use the fresh alkyne when it arrives',
                todoIndex: 3,
            },
            {
                username: username,
                projectIndex: 0,
                name: 'Dry Ice',
                desc: 'Move it to the storage container',
                duedate: defaultDates[7],
                notes: 'Be sure to dispose of the plastic inside the container before filling it',
                todoIndex: 3,
            },
            {
                username: username,
                projectIndex: 1,
                name: 'Chemical delivery',
                desc: 'Materials for the next set of reactions',
                duedate: defaultDates[8],
                notes: 'May need to order more AlCl3 soon',
                todoIndex: 4,
            },
            {
                username: username,
                projectIndex: 0,
                name: 'Fume Hood Maintenance',
                desc: 'Scheduled maintenance',
                duedate: defaultDates[9],
                notes: "Won't be able to use the fume hood on this day",
                todoIndex: 4,
            },
        ];
        return todoList;
    }

    function todayPlusInterval(interval) {
        const today = new Date();
        let day = today.getDate();
        let month = today.getMonth() + 1;
        let year = today.getFullYear();

        const int = interval - 1;
        const thirtyDayMonths = [4, 6, 9, 11];

        if (month == '02' && day >= 28 - int) {
            day = day + interval - 28;
            month = month + 1;
        } else if (thirtyDayMonths.includes(month) && day >= 30 - int) {
            day = day + interval - 30;
            month = month + 1;
        } else if (day >= 31 - int && month == '12') {
            day = day + interval - 31;
            month = 1;
            year = year + 1;
        } else if (day >= 30 - int) {
            day = day + interval - 30;
            month = month + 1;
        } else {
            day = day + interval;
        }

        const padMonth = month.toString().padStart(2, 0);
        const padDay = day.toString().padStart(2, 0);
        const newDate = `${year}-${padMonth}-${padDay}`;

        return newDate;
    }

    function createDefaultDates() {
        defaultDates[0] = todayPlusInterval(-1);
        defaultDates[1] = todayPlusInterval(0);
        defaultDates[2] = todayPlusInterval(1);
        defaultDates[3] = todayPlusInterval(2);
        defaultDates[4] = todayPlusInterval(14);
        defaultDates[5] = todayPlusInterval(0);
        defaultDates[6] = todayPlusInterval(0);
        defaultDates[7] = todayPlusInterval(1);
        defaultDates[8] = todayPlusInterval(1);
        defaultDates[9] = todayPlusInterval(4);
        //return defaultDates;
    }

    return { init, makeProjectList, makeTodoList };
})();

const CALENDAR = (() => {
    // todos from database that have been through date/project filtering
    let filteredTodoList = [];
    let chosenMonthTodoList = [];

    // store info on today's date
    const dateInfo = {
        todayDate: undefined,
        dayOfWeek: undefined,
        day: undefined,
        month: undefined,
        year: undefined,
    };

    let chosenDate = undefined;
    let chosenMonth = undefined;
    let chosenYear = undefined;

    const DOM = {
        calendarContainer: undefined,
        calendarGridContainer: undefined,
        calendarDataContainer: undefined,

        previousMonthBtn: undefined,
        nextMonthBtn: undefined,
        calendarTodoNodeList: undefined,

        dataName: undefined,
        dataDescription: undefined,
        dataNotes: undefined,
        dataProjectDropdown: undefined,
        submitCalendarTodoBtn: undefined,
    };

    function init(parentNode) {
        console.log('CALENDAR initializing');
        DOM.calendarContainer = parentNode;

        filteredTodoList = DATABASE.getFilteredTodoList();

        getDateInfo();
        filterTodosByMonth();
        renderCalendar();
        renderDataContainer();
        bindCalendar();
    }

    // setting up the calendar
    // variables
    function getDateInfo() {
        todayDate = new Date();
        dateInfo.todayDate = todayDate;
        dateInfo.dayOfWeek = todayDate.getDay();
        dateInfo.day = todayDate.getDate();
        dateInfo.month = todayDate.getMonth() + 1;
        // dateInfo.month = 1;
        dateInfo.year = todayDate.getFullYear();

        chosenMonth = dateInfo.month;
        chosenYear = dateInfo.year;
    }

    function filterTodosByMonth() {
        // chosenMonth is initialized as the current month, then modified by clickPrevMonth() and clickNextMonth()
        // due date is YYYY-MM-DD
        chosenMonthTodoList = filteredTodoList
            .filter((todo) => todo.duedate.slice(5, 7) == chosenMonth)
            .filter((todo) => todo.duedate.slice(0, 4) == chosenYear);
    }

    // calendar grid
    function renderCalendar() {
        renderLayout();
        renderCalendarBtns();
        renderNameOfDay();
        renderBlanks();
        renderDate();
        renderCalendarTodos();
    }

    function renderLayout() {
        const layout = layoutHTML();
        DOM.calendarContainer.insertAdjacentHTML('beforeend', layout);

        //prettier-ignore
        DOM.calendarGridContainer = document.querySelector('#calendar-grid-container')
        //prettier-ignore
        DOM.calendarDataContainer = document.querySelector('#calendar-data-container')
    }

    function layoutHTML() {
        let template = '';
        template += `<div id="calendar-grid-container"></div>`;
        return template;
    }

    function renderCalendarBtns() {
        const calendarBtns = calendarBtnsHTML();
        DOM.calendarGridContainer.insertAdjacentHTML('beforeend', calendarBtns);
    }

    function calendarBtnsHTML() {
        // prettier-ignore
        const monthList = ['Blank', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        let template = '';
        template += `<div id="month-menu-container">
                        <button class="menu-button" id="prev-month-button">⬅</button>
                        <div id="month-menu-month">${monthList[chosenMonth]} ${chosenYear}</div>
                        <button class="menu-button" id="next-month-button">➡</button>
                    </div>`;
        return template;
    }

    function renderNameOfDay() {
        // prettier-ignore
        const dayArray = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        for (let i = 0; i < 7; i++) {
            const nameOfDay = nameOfDayHTML(dayArray[i]);
            DOM.calendarGridContainer.insertAdjacentHTML(
                'beforeend',
                nameOfDay
            );
        }
    }

    function nameOfDayHTML(day) {
        let template = '';
        template += `<div class='day'>${day}</div>`;
        return template;
    }

    function renderBlanks() {
        const initialDayOfWeek = getInitialDayOfWeek();
        let numberOfBlanks = 0;

        if (initialDayOfWeek === 0) {
            numberOfBlanks = 6;
        } else {
            numberOfBlanks = initialDayOfWeek - 1;
        }

        for (let i = 0; i < numberOfBlanks; i++) {
            const blankGridDate = blankGridDateHTML();
            DOM.calendarGridContainer.insertAdjacentHTML(
                'beforeend',
                blankGridDate
            );
        }
    }

    function getInitialDayOfWeek() {
        const initialDay = new Date(`${chosenMonth} 01 ${chosenYear}`);
        const initialDayOfWeek = initialDay.getDay();
        return initialDayOfWeek;
    }

    function blankGridDateHTML() {
        let template = '';
        template += `<div class='date' data-date='blank'></div>`;
        return template;
    }

    function renderDate() {
        const totalDays = getDaysInCurrentMonth();
        for (let i = 1; i < totalDays + 1; i++) {
            const gridDate = gridDateHTML(i);
            DOM.calendarGridContainer.insertAdjacentHTML('beforeend', gridDate);
        }
    }

    function getDaysInCurrentMonth() {
        // prettier-ignore
        const daysInMonthNonLeapArray = ['0', '31', '28', '31', '30', '31', '30', '31', '31', '30', '31', '30', '31']
        // prettier-ignore
        const daysInCurrentMonth = parseInt(daysInMonthNonLeapArray[chosenMonth]);
        return daysInCurrentMonth;
    }

    function gridDateHTML(num) {
        const data = num.toString().padStart(2, '0');
        let template = '';
        if (data == dateInfo.day) {
            template += `<div class='date today-highlight' data-date=${data}>${num}</div>`;
        } else {
            template += `<div class='date' data-date=${data}>${num}</div>`;
        }
        return template;
    }

    // todos
    function renderCalendarTodos() {
        chosenMonthTodoList.forEach((todo) => {
            const todoDate = todo.duedate.slice(8, 10);
            // prettier-ignore
            const currentTile = document.querySelector(`[data-date="${todoDate}"]`);
            const calendarTodo = calendarTodoHTML(todo);
            currentTile.insertAdjacentHTML('beforeend', calendarTodo);
        });
    }

    function calendarTodoHTML(todo) {
        let snippet = '';
        if (todo.name.length > 20) {
            snippet = todo.name.slice(0, 18) + '...';
        } else {
            snippet = todo.name;
        }
        let template = '';
        template += `<div class='calendar-todo projectColour${todo.projectIndex}' data-todo=${todo.todoIndex} data-project=${todo.projectIndex}>${snippet}</div>`;
        return template;
    }

    // data area
    function renderDataContainer() {
        renderDataContainerLayout();
        renderDataFields();
    }

    function renderDataContainerLayout() {
        const dataContainerLayout = dataContainerLayoutHTML();
        DOM.calendarContainer.insertAdjacentHTML(
            'beforeend',
            dataContainerLayout
        );
        DOM.calendarDataContainer = document.querySelector(
            '#calendar-data-container'
        );
    }

    function dataContainerLayoutHTML() {
        let template = '';
        template += `<div id="calendar-data-container"></div>`;
        return template;
    }

    function renderDataFields() {
        const dataFields = dataFieldsHTML();
        DOM.calendarDataContainer.insertAdjacentHTML('beforeend', dataFields);

        DOM.dataName = document.querySelector('#data-name');
        DOM.dataDescription = document.querySelector('#data-description');
        DOM.dataNotes = document.querySelector('#data-notes');
    }

    function dataFieldsHTML() {
        let template = '';
        template += `
            <div class="data-div">
                <div class="data-heading">Name</div>
                <div id="data-name" class="data"></div>
            </div>

            <div class="data-div">
                <div class="data-heading">Description</div>
                <div id="data-description" class="data"></div>
            </div>

            <div class="data-div">
                <div class="data-heading">Notes</div>
                <div id="data-notes" class="data"></div>
            </div>`;
        return template;
    }

    // bindings
    function bindCalendar() {
        bindCalendarBtns();
        bindClickCalendarDate();
        bindMouseoverCalendarTodo();
    }

    function bindCalendarBtns() {
        DOM.previousMonthBtn = document.querySelector('#prev-month-button');
        DOM.previousMonthBtn.addEventListener('click', clickPrevMonthBtn);

        DOM.nextMonthBtn = document.querySelector('#next-month-button');
        DOM.nextMonthBtn.addEventListener('click', clickNextMonthBtn);
    }

    function bindClickCalendarDate() {
        // prettier-ignore
        DOM.calendarGridContainer.addEventListener('click', clickCalendarDate, {capture: true,});
    }

    function bindMouseoverCalendarTodo() {
        DOM.calendarTodoNodeList = document.querySelectorAll('.calendar-todo');
        DOM.calendarTodoNodeList.forEach((button) => {
            button.addEventListener('mouseover', clickCalendarTodo);
        });
    }

    // result of clicking the forward or back buttons on the calendar
    function clickPrevMonthBtn() {
        chosenMonth -= 1;
        if (chosenMonth === 0) {
            chosenMonth = 12;
            chosenYear -= 1;
        }

        DOM.calendarContainer.replaceChildren('');
        filterTodosByMonth();
        renderCalendar();
        renderDataContainer();
        bindCalendar();
    }

    function clickNextMonthBtn() {
        chosenMonth += 1;
        if (chosenMonth === 13) {
            chosenMonth = 1;
            chosenYear += 1;
        }

        DOM.calendarContainer.replaceChildren('');
        filterTodosByMonth();
        renderCalendar();
        renderDataContainer();
        bindCalendar();
    }

    /* result of clicking the grid */
    // click a blank area: clear data
    // click a date: set up new todo
    function clickCalendarDate(event) {
        const clickedCalendarDate = event.target.dataset.date;
        resetCalendarDataContainer();

        if (!clickedCalendarDate) {
            return;
        }

        // used for finding the date for a new todo
        chosenDate = clickedCalendarDate;

        setupNewCalendarTodo();
    }

    function resetCalendarDataContainer() {
        DOM.calendarDataContainer.replaceChildren('');
        renderDataFields();
    }

    function setupNewCalendarTodo() {
        allowEditingOfDataFields();
        renderProjectDropdown();
        populateProjectDropdown();
        renderSubmitCalendarTodoBtn();
        bindSubmitCalendarTodoBtn();
    }

    function allowEditingOfDataFields() {
        DOM.dataName.setAttribute('contentEditable', 'true');
        DOM.dataName.classList.add('data-input-field');
        DOM.dataName.focus();

        DOM.dataDescription.setAttribute('contentEditable', 'true');
        DOM.dataDescription.classList.add('data-input-field');

        DOM.dataNotes.setAttribute('contentEditable', 'true');
        DOM.dataNotes.classList.add('data-input-field');
    }

    function renderProjectDropdown() {
        const projectDropdown = projectDropdownHTML();
        DOM.calendarDataContainer.insertAdjacentHTML(
            'beforeend',
            projectDropdown
        );
        DOM.dataProjectDropdown = document.querySelector(
            '#data-project-dropdown'
        );
    }

    function projectDropdownHTML() {
        let template = '';
        template += `<div class="data-div">
                        <select id="data-project-dropdown" class="data-input-field" required></select>
                    </div>`;
        return template;
    }

    function populateProjectDropdown() {
        const blankOption = blankOptionHTML();
        DOM.dataProjectDropdown.insertAdjacentHTML('beforeend', blankOption);

        const projectList = DATABASE.getProjectList();

        projectList.forEach((project) => {
            const projectOption = projectOptionHTML(project);
            DOM.dataProjectDropdown.insertAdjacentHTML(
                'beforeend',
                projectOption
            );
        });

        DOM.dataProjectDropdown.children[0].selected = true;
        DOM.dataProjectDropdown.children[0].value = '';
        DOM.dataProjectDropdown.children[0].disabled = true;

        // Auto-select the current project (if not All)
        // only works when projectIndexes are in order from 1 ...
        const projectIndex = DATABASE.getFilterSettings().projectIndex;
        if (projectIndex > -1) {
            DOM.dataProjectDropdown.selectedIndex = parseInt(projectIndex) + 1;
        }
    }

    function blankOptionHTML() {
        let template = '';
        template += `<option class="dropdown-option" value="disabled">Choose project: </option>`;

        return template;
    }

    function projectOptionHTML(project) {
        let template = '';
        template += `<option class="dropdown-option" value="${project.projectIndex}">${project.projectName}</option>`;

        return template;
    }

    function renderSubmitCalendarTodoBtn() {
        const submitCalendarTodoBtn = submitCalendarTodoBtnHTML();
        // prettier-ignore
        DOM.calendarDataContainer.insertAdjacentHTML('beforeend', submitCalendarTodoBtn);
    }

    function submitCalendarTodoBtnHTML() {
        let template = '';
        template += `<div id="submit-calendar-todo-container">
                        <button id="submit-calendar-todo">✔</button>
                    </div>`;
        return template;
    }

    function bindSubmitCalendarTodoBtn() {
        // prettier-ignore
        DOM.submitCalendarTodoBtn = document.querySelector('#submit-calendar-todo')
        // prettier-ignore
        DOM.submitCalendarTodoBtn.addEventListener('click', clickSubmitCalendarTodoBtn)
    }

    /* result of clicking to submit a new todo from the calendar */
    function clickSubmitCalendarTodoBtn() {
        // include data checks

        const newTodo = getNewTodoData();
        DATABASE.addNewTodoToDB(newTodo);
    }

    function getNewTodoData() {
        const currentUser = DATABASE.getUsername();
        const projectIndex = DOM.dataProjectDropdown.selectedIndex - 1;
        const newTodoIndex = DATABASE.getNewTodoIndex(projectIndex);

        const twoDigitMonth = chosenMonth.toString().padStart(2, '0');

        const chosenDateString = `${chosenYear}-${twoDigitMonth}-${chosenDate}`;

        const newTodo = {
            username: currentUser,
            projectIndex: projectIndex,
            name: DOM.dataName.textContent,
            duedate: chosenDateString,
            desc: DOM.dataDescription.textContent,
            notes: DOM.dataNotes.textContent,
            todoIndex: newTodoIndex,
        };
        return newTodo;
    }

    /* result of mousover on a todo on the grid */
    function clickCalendarTodo(event) {
        const projectIndex = event.target.dataset.project;
        const todoIndex = event.target.dataset.todo;
        const currentTodo = findTodo(projectIndex, todoIndex);

        DOM.dataName.textContent = currentTodo.name;
        DOM.dataDescription.textContent = currentTodo.desc;
        DOM.dataNotes.textContent = currentTodo.notes;
    }

    function findTodo(projectIndex, todoIndex) {
        const currentTodo = chosenMonthTodoList
            .filter((todo) => todo.projectIndex == projectIndex)
            .find((todo) => todo.todoIndex == todoIndex);

        return currentTodo;
    }

    return { init };
})();
