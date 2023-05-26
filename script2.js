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

const MAIN = (() => {
    async function init() {
        // retrieves data from the database and allows the corresponding arrays to be accessed by other functions
        await DATABASE.init();

        // On top of putting up the initial HTML, LAYOUT initializes other modules, simultaneously sending the parent node on which they should be appended to
        LAYOUT.init();
    }

    window.addEventListener('DOMContentLoaded', init);
})();

const DATABASE = (() => {
    let username = 'default';
    let userProjectList = [];
    let userTodoList = [];
    let filteredTodoList = [];

    let filterSettings = { projectIndex: -1, dateIndex: 'all' };

    async function init() {
        console.log('DATABASE initializing');
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
        const filterSettingsString =
            window.localStorage.getItem('filterSettings');
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

        window.localStorage.setItem('autoOpenFlag', true);
        window.localStorage.setItem('autoOpenTodo', JSON.stringify(newTodo));
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

        window.localStorage.setItem('autoOpenFlag', true);
        window.localStorage.setItem('autoOpenTodo', JSON.stringify(editedTodo));
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
        window.localStorage.setItem('filterSettings', filterSettingsString);
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
        init,
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
    };
})();

const LAYOUT = (() => {
    const DOM = {
        body: document.querySelector('body'),
        dateContainer: undefined,
        projectContainer: undefined,
        newProjectContainer: undefined,
        todoContainer: undefined,
    };

    function init() {
        console.log('LAYOUT initializing');
        appendLayout();
        assignDOM();

        DATES.init(DOM.dateContainer);
        PROJECTS.init(DOM.projectContainer);
        NEWPROJECT.init(DOM.newProjectContainer);
        NEWTODO.init(DOM.todoContainer);
        TODOS.init(DOM.todoContainer);
    }

    function assignDOM() {
        // prettier-ignore
        DOM.dateContainer = document.querySelector('#date-container');
        // prettier-ignore
        DOM.projectContainer = document.querySelector('#project-container');
        // prettier-ignore
        DOM.newProjectContainer = document.querySelector('#new-project-container');
        // prettier-ignore
        DOM.todoContainer = document.querySelector('#todo-container');
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

                <div id="date-container"></div>

                <div id="project-container"></div>

                <div id="new-project-container"></div>
            </div>

            <div id="display">
                <div id="header"></div>
                <div id="todo-container"></div>
            </div>

        </div>`;
        return template;
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
        //storeFilterSettings();
        DATABASE.changeDateFilterSetting(dateFilterSetting);
        TODOS.init();
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
        // storeFilterSettings();
        // TODOS.filterTodoList(projectFilterSetting);
        DATABASE.changeProjectFilterSetting(projectFilterSetting);
        TODOS.init();
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

        projectContainer: undefined, // part of PROJECTS module but need to use it
    };

    // setting up the new project button
    function init(newProjectContainer) {
        console.log('NEWPROJECT initializing');
        DOM.newProjectContainer = newProjectContainer;

        // need to borrow projectContainer to append the input field later
        DOM.projectContainer = PROJECTS.DOM.projectContainer;

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
        const newProject = {
            username: 'default',
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
        const projectIndex = DOM.newTodoProjectDropdown.selectedIndex - 1;
        const newTodoIndex = DATABASE.getNewTodoIndex(projectIndex);

        const newTodo = {
            username: 'default',
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
        // check to see if a todo has just been added or edited via localstorage ('true' or 'false')
        const autoOpenFlag = window.localStorage.getItem('autoOpenFlag');
        if (autoOpenFlag == 'true') {
            // prettier-ignore
            const autoOpenTodo = JSON.parse(window.localStorage.getItem('autoOpenTodo'));

            const currentTodo = document.querySelector(
                `[data-todo="${autoOpenTodo.todoIndex}"][data-project="${autoOpenTodo.projectIndex}"]`
            );
            renderTodoData(currentTodo, autoOpenTodo);
        }
        window.localStorage.setItem('autoOpenFlag', false);
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
