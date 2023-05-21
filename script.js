const Menu = (() => {
    let username = '';
    let projectList = [];
    let todoList = [];
    let filteredTodoList = [];
    let filterSettings = undefined;

    const DOM = {
        $projectContainer: document.querySelector('#project-container'),
        $dateSelectionNodeList: document.querySelectorAll('.date-item'),
        $projectNodeList: undefined,
        $newProjectButton: document.querySelector('#new-project'),
        $projDelButtonNodeList: undefined,
        $projectInputField: undefined,
        $header: document.querySelector('#header'),
        $listViewButton: document.querySelector('#list-view'),
        $calendarViewButton: document.querySelector('#calendar-view'),
    };

    function init() {
        getUsernameFromLocalStorage();
        getFilterSettingsFromLocalStorage();
        bindEvents();
        retrieveProjectList();
        retrieveTodoList();
        highlightDateOnStartup();
    }

    function bindEvents() {
        DOM.$dateSelectionNodeList.forEach((button) => {
            button.addEventListener('click', clickDateSelectionButton);
        });
        DOM.$newProjectButton.addEventListener('click', clickNewProjectButton);
        DOM.$listViewButton.addEventListener('click', clickDisplayList);
        DOM.$calendarViewButton.addEventListener('click', clickDisplayCalendar);
    }

    function bindClickProject() {
        DOM.$projectNodeList = document.querySelectorAll('.project');
        DOM.$projectNodeList.forEach((button) => {
            button.addEventListener('click', clickProjectButton);
        });
    }

    function bindInputProject() {
        DOM.$projectInputField = document.querySelector('.proj-input-field');
        DOM.$projectInputField.addEventListener('keypress', getNewProjectName);
        // this will cancel entering a new project if other buttons are clicked
        window.addEventListener('mouseup', cancelInputProjectByClick);
    }

    function bindProjectDeleteButtons() {
        DOM.$projDelButtonNodeList =
            document.querySelectorAll('.proj-del-button');
        DOM.$projDelButtonNodeList.forEach((button) => {
            button.addEventListener('click', clickDeleteProject);
        });
    }

    function getUsernameFromLocalStorage() {
        username = window.localStorage.getItem('userName');
        DOM.$header.textContent = `Welcome, ${username}`;
    }

    function getFilterSettingsFromLocalStorage() {
        const filterSettingsString =
            window.localStorage.getItem('filterSettings');
        filterSettings = JSON.parse(filterSettingsString);
    }

    async function retrieveProjectList() {
        // uri will include the username entered on login
        let uri = `http://localhost:3000/projects?username=${username}`;
        const res = await fetch(uri);
        projectList = await res.json();
        renderProjects();
    }

    async function retrieveTodoList() {
        // uri will include the username entered on login
        let uri = `http://localhost:3000/todos?username=${username}`;
        const res = await fetch(uri);
        todoList = await res.json();
        Display.filterTodoList(todoList);
        Calendar.filterTodoList(todoList);
        // Display.renderTodos(todoList);
    }

    function highlightDateOnStartup() {
        // prettier-ignore
        const selectedDateButton = document.querySelector(`[data-date="${filterSettings.dateIndex}"]`);
        selectedDateButton.classList.add('selected-date');
    }

    function renderProjects() {
        DOM.$projectContainer.replaceChildren();
        // Set up the 'All' selector
        let template = makeProjectAll();
        DOM.$projectContainer.insertAdjacentHTML('beforeend', template);

        // And the rest
        projectList.forEach((project) => {
            template = createProjectElement(project);
            DOM.$projectContainer.insertAdjacentHTML('beforeend', template);
        });

        bindClickProject();
        bindProjectDeleteButtons();
        highlightSelectedProjectOnStartup();
    }

    function makeProjectAll() {
        let template = '';
        template += `<div class="proj-button-container" data-project="-1">
                        <div class="project" data-project="-1">All</div>
                        </div>`;
        return template;
    }

    function createProjectElement(projectInfo) {
        let template = '';
        template += `<div class="proj-button-container" data-project=${projectInfo.projectIndex}>
                        <div class="project" data-project=${projectInfo.projectIndex}>${projectInfo.projectName}</div>
                            <div class="proj-del-button" data-project=${projectInfo.projectIndex}>✘</div>
                        </div>`;
        return template;
    }

    function highlightSelectedProjectOnStartup() {
        // prettier-ignore
        const selectedProjectButton = document.querySelector(`.project[data-project="${filterSettings.projectIndex}"]`);
        selectedProjectButton.classList.add('selected-project');
    }

    function clickNewProjectButton() {
        const projectInputField = createInputProjectField();
        // prettier-ignore
        DOM.$projectContainer.insertAdjacentHTML('beforeend', projectInputField)
        bindInputProject();
        DOM.$projectInputField.focus();
    }

    function clickDateSelectionButton(event) {
        filterSettings.dateIndex = event.target.dataset.date;
        highlightSelectedDate(event.target);
        storeFilterSettings();
        Display.filterTodoList(todoList);
    }

    function highlightSelectedDate(button) {
        // prettier-ignore
        document.querySelector('.selected-date').classList.remove('selected-date');
        button.classList.add('selected-date');
    }

    function createInputProjectField() {
        let template = '';
        template += `<div class="proj-button-container">
                        <div class="proj-input-field" contenteditable="true"</div></div>`;
        return template;
    }

    function getNewProjectName(event) {
        console.log(event);
        if (event.key === 'Enter') {
            if (!DOM.$projectInputField.textContent) {
                DOM.$projectInputField.remove();
            } else {
                // prettier-ignore
                const newProjectIndex = projectList[projectList.length - 1].projectIndex + 1;
                const newProject = {
                    username: username,
                    projectName: DOM.$projectInputField.textContent,
                    projectIndex: newProjectIndex,
                };
                addProjectToDB(newProject);
            }
        }
    }

    function cancelInputProjectByClick(event) {
        console.log(event);
        if (event.target != DOM.$projectInputField) {
            window.removeEventListener('mouseup', cancelInputProjectByClick);
            DOM.$projectInputField.remove();
        }
    }

    async function addProjectToDB(newProject) {
        let uri = `http://localhost:3000/projects`;
        await fetch(uri, {
            method: 'POST',
            body: JSON.stringify(newProject),
            headers: { 'Content-Type': 'application/json' },
        });
    }

    function clickProjectButton(event) {
        filterSettings.projectIndex = event.target.dataset.project;
        highlightSelectedProject(event.target);
        storeFilterSettings();
        Display.filterTodoList(todoList);
    }

    function storeFilterSettings() {
        // even if the page is refreshed manually, the filter settings will persist
        const filterSettingsString = JSON.stringify(filterSettings);
        window.localStorage.setItem('filterSettings', filterSettingsString);
    }

    function highlightSelectedProject(button) {
        // prettier-ignore
        document.querySelector('.selected-project').classList.remove('selected-project');
        button.classList.add('selected-project');
    }

    function getProjectList() {
        return projectList;
    }

    function getTodoData(projectIndex, todoIndex) {
        filteredTodoList = todoList.filter(
            (todo) => todo.projectIndex == projectIndex
        );
        const currentTodo = filteredTodoList.find(
            (todo) => todo.todoIndex == todoIndex
        );
        return currentTodo;
    }

    function getFilterSettings() {
        return filterSettings;
    }

    function getNewTodoIndex(projectIndex) {
        // prettier-ignore
        let currentTodoList = todoList.filter((todo) => todo.projectIndex == projectIndex);

        // need to sort to ensure that the largest todoIndex is in the last position in the array
        // prettier-ignore
        currentTodoList = currentTodoList.sort((a, b) => (a.todoIndex > b.todoIndex ? 1 : -1));

        // prettier-ignore
        const newTodoIndex = currentTodoList[currentTodoList.length - 1].todoIndex + 1;

        return newTodoIndex;
    }

    function getTodoList() {
        return todoList;
    }

    function getUsername() {
        return username;
    }

    async function clickDeleteProject(event) {
        const selectedProjectIndex = event.target.dataset.project;
        // prettier-ignore
        const selectedProject = projectList.find((project) => (project.projectIndex == selectedProjectIndex));
        const projectDBID = selectedProject.id;

        // find the todo.id of all todos with the corresponding projectIndex
        const associatedTodoListDBIDs = todoList
            .filter((todo) => todo.projectIndex == selectedProjectIndex)
            .map((todo) => todo.id);

        filterSettings = { projectIndex: -1, dateIndex: 'all' };
        storeFilterSettings();

        const deleteSuccess = await deleteSelectedProject(projectDBID);
        if (deleteSuccess) {
            deleteAssociatedTodoList(associatedTodoListDBIDs);
        }
    }

    async function deleteSelectedProject(projectDBID) {
        let uri = `http://localhost:3000/projects/${projectDBID}`;
        await fetch(uri, { method: 'DELETE' });
        return true;
    }

    async function deleteAssociatedTodoList(associatedTodoListDBIDs) {
        for (todoID of associatedTodoListDBIDs) {
            let uri = `http://localhost:3000/todos/${todoID}`;
            await fetch(uri, { method: 'DELETE' });
        }
    }

    function clickDisplayList() {
        Display.displayTodos();
        DOM.$calendarViewButton.classList.remove('selected-view');
        DOM.$listViewButton.classList.add('selected-view');
    }

    function clickDisplayCalendar() {
        Display.displayCalendar();
        DOM.$listViewButton.classList.remove('selected-view');
        DOM.$calendarViewButton.classList.add('selected-view');
    }

    init();

    return {
        getProjectList,
        getTodoData,
        getFilterSettings,
        getNewTodoIndex,
        getTodoList,
        getUsername,
    };
})();

const Display = (() => {
    let filteredTodoList = [];
    // viewSelection will toggle between 'list' and 'calendar'
    let viewSelection = 'list';

    // undefined means that it will be set after creation
    const DOM = {
        $display: document.querySelector('#display'),
        $todoContainer: document.querySelector('#todo-container'),
        $newTodoButton: undefined,
        $todoNodeList: undefined,
        $todoDateButton: undefined,
        $projectDropdown: undefined,
        $todoSubmitButton: undefined,
        $todoDelButtonNodeList: undefined,
        $todoEditButton: undefined,
        $editingTodo: undefined,
        $editingTodoData: undefined,
        $BHSContainer: document.querySelector('#BHS-container'),
    };

    function bindClickNewTodo() {
        (DOM.$newTodoButton = document.querySelector('#new-todo')),
            DOM.$newTodoButton.addEventListener('click', clickNewTodoButton);
    }

    function bindClickTodo() {
        DOM.$todoNodeList = document.querySelectorAll('.todo');
        DOM.$todoNodeList.forEach((button) => {
            button.addEventListener('click', clickTodoButton);
        });
    }

    function bindTodoDeleteButtons() {
        // prettier-ignore
        DOM.$todoDelButtonNodeList = document.querySelectorAll('.todo-del-button');
        DOM.$todoDelButtonNodeList.forEach((button) => {
            button.addEventListener('click', clickDeleteTodo);
        });
    }

    function bindSubmitNewTodo() {
        DOM.$todoSubmitButton = document.querySelector('.todo-submit-button');
        DOM.$todoSubmitButton.addEventListener('click', getNewTodoData);
    }

    function bindDateSelectRemoveBorder() {
        DOM.$projectDropdown.addEventListener('change', removeBorder);
        DOM.$todoDateButton.addEventListener('change', removeBorder);
    }

    function bindTodoEditButton() {
        DOM.$todoEditButton = document.querySelector('.todo-edit-button');
        DOM.$todoEditButton.addEventListener('click', clickEditTodoData);
    }

    function init() {
        DOM.$BHSContainer.style.display = 'none';
    }

    function filterTodoList(todoList) {
        const filterSettings = Menu.getFilterSettings();

        // first, filter by project
        if (filterSettings.projectIndex != -1) {
            // prettier-ignore
            todoList = todoList.filter((todo) => todo.projectIndex == filterSettings.projectIndex);
        }
        // then filter by date
        todoList = filterByDate(todoList, filterSettings.dateIndex);
        renderTodos(todoList);
    }

    function renderTodos(todoList) {
        filteredTodoList = todoList;

        DOM.$todoContainer.replaceChildren('');

        // set up the "New Todo" button
        let template = makeTodoNew();
        DOM.$todoContainer.insertAdjacentHTML('beforeend', template);
        bindClickNewTodo();

        if (todoList.length === 0) {
            return;
        }

        todoList = sortByDate(todoList);
        // flag certain due-days for color-coding and special text
        todoList = flagDateColorCoding(todoList);

        // change dates to be in " Aug 16 '23 " format
        todoList = alterDateToBePretty(todoList);

        // create and HTML and render it
        todoList.forEach((todo) => {
            if (todo.dateFlag) {
                template = createTodoElementWithDateFlag(todo);
            } else {
                template = createTodoElement(todo);
            }
            DOM.$todoContainer.insertAdjacentHTML('beforeend', template);
        });

        bindClickTodo();
        bindTodoDeleteButtons();
        autoOpenTodoAfterEdit();
    }

    function makeTodoNew() {
        let template = '';
        template += `<div id="new-todo">New Todo
                        </div>`;
        return template;
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

    function sortByDate(todoList) {
        todoList = todoList.sort((a, b) => (a.duedate > b.duedate ? 1 : -1));
        return todoList;
    }

    function flagDateColorCoding(todoList) {
        const dateToday = todayPlusInterval(0);
        const dateTomorrow = todayPlusInterval(1);
        const dateDayAfterTomorrow = todayPlusInterval(2);
        todoList.forEach((todo) => {
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
        return todoList;
    }

    function alterDateToBePretty(todoList) {
        todoList.forEach((todo) => {
            todo.prettyduedate = prettifyDate(todo.duedate);
        });
        return todoList;
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

    function createTodoElement(todo) {
        let template = '';
        template += `<div class="todo" data-todo=${todo.todoIndex} data-project=${todo.projectIndex}>
                        <div class="todo-name">${todo.name}</div>
                        <div class="todo-date">${todo.prettyduedate}</div>
                        <div class="todo-del-button" data-todo=${todo.todoIndex} data-project=${todo.projectIndex}>✘</div>
                        </div>`;
        return template;
    }

    function createTodoElementWithDateFlag(todo) {
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

    function clickTodoButton(event) {
        resetNewTodo();
        resetEditTodo();

        const projectIndex = event.target.dataset.project;
        const todoIndex = event.target.dataset.todo;

        // this command doesn't work after resetNewTodo() because a new instance of the button is created?
        // const currentButton = event.target;
        //prettier-ignore
        const currentButton = document.querySelector(`[data-todo="${todoIndex}"][data-project="${projectIndex}"]`)
        const currentTodo = Menu.getTodoData(projectIndex, todoIndex);

        displayTodoData(currentButton, currentTodo);
    }

    function resetNewTodo() {
        if (!document.querySelector('.input-new-container')) {
            return;
        } else {
            renderTodos(filteredTodoList);
        }
    }

    function resetEditTodo() {
        if (!document.querySelector('.todo-edit-field')) {
            return;
        } else {
            renderTodos(filteredTodoList);
        }
    }

    function removeBorder(event) {
        event.target.classList.add('data-selected');
    }

    function displayTodoData(button, todo) {
        if (button.classList.contains('current-todo')) {
            closeOpenTodo();
            return;
        }
        closeOpenTodo();
        button.classList.add('current-todo');
        const openTodo = createOpenTodo(todo);
        button.insertAdjacentHTML('afterend', openTodo);
        bindTodoEditButton();
    }

    function closeOpenTodo() {
        // if a todo is open, close it
        // if a todo is highlighted as currently selected, remove the highlight
        if (document.querySelector('.open-todo')) {
            document.querySelector('.open-todo').remove();
        }
        if (document.querySelector('.current-todo')) {
            document
                .querySelector('.current-todo')
                .classList.remove('current-todo');
        }
    }

    function createOpenTodo(todo) {
        let template = '';
        template += `<div class="open-todo">
                        <div class="open-todo-data">
                            <div class="todo-data">${todo.desc}</div>
                            <div class="todo-data">${todo.notes}</div>
                        </div>
                        <div class="todo-edit-button" data-todo=${todo.todoIndex} data-project=${todo.projectIndex}>E</div>
                    </div>`;
        return template;
    }

    function clickNewTodoButton() {
        // housekeeping for resetting anything that is open
        resetEditTodo();
        closeOpenTodo();

        const todoInputNameFields = createTodoInputNameFields();
        DOM.$newTodoButton.remove();
        DOM.$todoContainer.insertAdjacentHTML(
            'afterbegin',
            todoInputNameFields
        );

        DOM.$newTodoButton = document.querySelector('#new-todo');
        const todoInputDataFields = createTodoInputDataFields();
        DOM.$newTodoButton.insertAdjacentHTML('afterend', todoInputDataFields);

        DOM.$todoDateButton = document.querySelector('#date-input-field');
        populateProjectDropdown();
        bindSubmitNewTodo();
        bindDateSelectRemoveBorder();
    }

    function createTodoInputNameFields() {
        let template = '';

        template += `<div id="new-todo" class="input-new-container">
                        <div class="todo-name submit-todo-name todo-input-field" contenteditable="true" data-placeholder="New Todo"></div>
                        <div class="todo-date"></div>
                        <input type="date" id="date-input-field" class="todo-input-field submit-todo-duedate"></input>
                    </div>`;
        return template;
    }

    function createTodoInputDataFields() {
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
        DOM.$projectDropdown = document.querySelector('#project-dropdown');
        const projectList = Menu.getProjectList();

        projectList.forEach((project) => {
            const projectOption = createProjectOption(project);
            DOM.$projectDropdown.insertAdjacentHTML('beforeend', projectOption);
        });

        DOM.$projectDropdown.required = true;

        DOM.$projectDropdown.children[0].selected = true;
        DOM.$projectDropdown.children[0].value = '';
        DOM.$projectDropdown.children[0].disabled = true;
        console.log(DOM.$projectDropdown.children);

        // Auto-select the current project (if not All)
        // only works when projectIndexes are in order from 1 ...
        const projectIndex = Menu.getFilterSettings().projectIndex;
        if (projectIndex > -1) {
            DOM.$projectDropdown.selectedIndex = parseInt(projectIndex) + 1;
        }
    }

    function createProjectOption(project) {
        let template = '';
        template += `<option class="dropdown-option" value="${project.projectIndex}">${project.projectName}</option>`;

        return template;
    }

    function getNewTodoData() {
        const projectIndex = DOM.$projectDropdown.selectedIndex - 1;
        const newTodoIndex = Menu.getNewTodoIndex(projectIndex);

        const newTodo = {
            username: Menu.getUsername(),
            projectIndex: projectIndex,
            name: document.querySelector('.submit-todo-name').textContent,
            duedate: document.querySelector('.submit-todo-duedate').value,
            desc: document.querySelector('.submit-todo-desc').textContent,
            notes: document.querySelector('.submit-todo-notes').textContent,
            todoIndex: newTodoIndex,
        };

        addTodoToDB(newTodo);
    }

    async function addTodoToDB(newTodo) {
        const filterSettingsString = JSON.stringify(Menu.getFilterSettings());
        window.localStorage.setItem('filterSettings', filterSettingsString);

        window.localStorage.setItem('autoOpenFlag', true);
        window.localStorage.setItem('autoOpenTodo', JSON.stringify(newTodo));

        let uri = `http://localhost:3000/todos`;
        await fetch(uri, {
            method: 'POST',
            body: JSON.stringify(newTodo),
            headers: { 'Content-Type': 'application/json' },
        });
    }

    async function clickDeleteTodo(event) {
        const selectedProjectIndex = event.target.dataset.project;
        const selectedTodoIndex = event.target.dataset.todo;

        // prettier-ignore
        const selectedTodo = findSelectedTodo(selectedProjectIndex, selectedTodoIndex);

        deleteSelectedTodo(selectedTodo.id);
    }

    function findSelectedTodo(selectedProjectIndex, selectedTodoIndex) {
        const selectedTodo = Menu.getTodoList()
            .filter((todo) => todo.projectIndex == selectedProjectIndex)
            .find((todo) => todo.todoIndex == selectedTodoIndex);

        return selectedTodo;
    }

    async function deleteSelectedTodo(todoDBID) {
        let uri = `http://localhost:3000/todos/${todoDBID}`;
        await fetch(uri, { method: 'DELETE' });
    }

    function clickEditTodoData(event) {
        DOM.$editingTodo = document.querySelector('.current-todo');
        DOM.$editingTodoData = document.querySelector('.open-todo-data');

        const selectedProjectIndex = event.target.dataset.project;
        const selectedTodoIndex = event.target.dataset.todo;

        removeTodoButtonEventListener();

        // prettier-ignore
        const selectedTodo = findSelectedTodo(selectedProjectIndex, selectedTodoIndex);
        allowEditingOfTitleInfo(selectedTodo.duedate);
        // maybe will add a dropdown to change project later..? will need to send selectedTodo here
        allowEditingOfDataInfo();
    }

    function removeTodoButtonEventListener() {
        // prettier-ignore
        DOM.$editingTodo.removeEventListener('click', clickTodoButton)
    }

    function allowEditingOfTitleInfo(currentDuedate) {
        const currentTodo = DOM.$editingTodo;
        currentTodo.classList.add('hide-hover');

        currentTodo.children[0].classList.add('todo-edit-field');
        currentTodo.children[0].setAttribute('contenteditable', 'true');
        currentTodo.children[1].textContent = '';
        currentTodo.children[2].remove();
        const dateField = createDateInputField();
        currentTodo.insertAdjacentHTML('beforeend', dateField);

        currentTodo.children[2].value = currentDuedate;
    }

    function createDateInputField() {
        let template = '';
        template += `<input type="date" id="date-input-field" class="todo-input-field">`;
        return template;
    }

    function allowEditingOfDataInfo() {
        const currentTodoData = DOM.$editingTodoData;

        currentTodoData.children[0].classList.add('todo-edit-field');
        currentTodoData.children[0].setAttribute('contenteditable', 'true');
        currentTodoData.children[1].classList.add('todo-edit-field');
        currentTodoData.children[1].setAttribute('contenteditable', 'true');
        currentTodoData.nextElementSibling.textContent = '✔';
        currentTodoData.nextElementSibling.classList.add('todo-submit-button');
        currentTodoData.nextElementSibling.classList.remove('todo-edit-button');
        // prettier-ignore
        currentTodoData.nextElementSibling.removeEventListener('click', clickEditTodoData)
        // prettier-ignore
        currentTodoData.nextElementSibling.addEventListener('click', collectEditedData)
    }

    function collectEditedData(event) {
        // need to get the other data from the todo? or will PUT just change the altered fields?
        const selectedProjectIndex = event.target.dataset.project;
        const selectedTodoIndex = event.target.dataset.todo;
        // prettier-ignore
        const selectedTodo = findSelectedTodo(selectedProjectIndex, selectedTodoIndex);

        const editedTodo = {
            username: selectedTodo.username,
            projectIndex: selectedTodo.projectIndex,
            name: DOM.$editingTodo.children[0].textContent,
            duedate: DOM.$editingTodo.children[2].value,
            desc: DOM.$editingTodoData.children[0].textContent,
            notes: DOM.$editingTodoData.children[1].textContent,
            todoIndex: selectedTodo.todoIndex,
        };
        saveEditedTodoToDB(editedTodo, selectedTodo.id);
    }

    async function saveEditedTodoToDB(editedTodo, todoDBID) {
        const filterSettingsString = JSON.stringify(Menu.getFilterSettings());
        window.localStorage.setItem('filterSettings', filterSettingsString);

        window.localStorage.setItem('autoOpenFlag', true);
        window.localStorage.setItem('autoOpenTodo', JSON.stringify(editedTodo));

        let uri = `http://localhost:3000/todos/${todoDBID}`;
        await fetch(uri, {
            method: 'PUT',
            body: JSON.stringify(editedTodo),
            headers: { 'Content-Type': 'application/json' },
        });
    }

    function autoOpenTodoAfterEdit() {
        // check to see if an edit has just taken place (true or false)
        const editFlag = window.localStorage.getItem('autoOpenFlag');
        if (editFlag == 'true') {
            const editedTodo = JSON.parse(
                window.localStorage.getItem('autoOpenTodo')
            );
            console.log(editedTodo);

            const currentButton = document.querySelector(
                `[data-todo="${editedTodo.todoIndex}"][data-project="${editedTodo.projectIndex}"]`
            );
            displayTodoData(currentButton, editedTodo);
        }
        window.localStorage.setItem('autoOpenFlag', false);
    }

    // this (unexpectedly?) will restore all the todos, ie don't need to call renderTodos since all the info is saved
    // including eventListeners. If the ability to add todos is given to the calender, then will want to call renderTodos anyway..
    function displayTodos() {
        if (viewSelection === 'calendar') {
            DOM.$BHSContainer.style.display = 'none';
            DOM.$todoContainer.style.display = 'flex';
            DOM.$;
            viewSelection = 'list';
        } else {
            console.log('nothing happened.');
        }
    }

    function displayCalendar() {
        if (viewSelection === 'list') {
            DOM.$BHSContainer.style.display = 'flex';
            DOM.$todoContainer.style.display = 'none';
            viewSelection = 'calendar';
        } else {
            console.log('nothing happened.');
        }
    }

    init();

    return {
        filterTodoList,
        autoOpenTodoAfterEdit,
        displayTodos,
        displayCalendar,
    };
})();

const Calendar = (() => {
    const dateInfo = {
        todayDate: undefined,
        dayOfWeek: undefined,
        day: undefined,
        month: undefined,
        year: undefined,
    };

    let todoList = [];
    let currentMonthTodos = [];

    const DOM = {
        $display: document.querySelector('#display'),
        $calendarContainer: document.querySelector('#calendar-container'),

        $todoNodeList: undefined,
        $dataName: document.querySelector('#data-name'),
        $dataDescription: document.querySelector('#data-description'),
        $dataNotes: document.querySelector('#data-notes'),
    };

    function init() {
        getDateInfo();
        renderGrid();
        bindClickDate();

        //printTodoToCalendar();
    }

    function bindClickDate() {
        DOM.$calendarContainer.addEventListener('click', clickDate);
    }

    function bindClickTodo() {
        DOM.$todoNodeList = document.querySelectorAll('.calendar-todo');
        DOM.$todoNodeList.forEach((button) => {
            button.addEventListener('click', clickTodo);
        });
    }

    function filterTodoList(sentTodoList) {
        const filterSettings = Menu.getFilterSettings();
        todoList = sentTodoList;
        // first, filter by project
        if (filterSettings.projectIndex != -1) {
            // prettier-ignore
            todoList = todoList.filter((todo) => todo.projectIndex == filterSettings.projectIndex);
        }
        // then filter by the (selected) month
        // (currently filters by the current month)
        // prettier-ignore
        currentMonthTodos = todoList.filter((todo) => todo.duedate.slice(5,7) == dateInfo.month)
        printTodoToCalendar();
    }

    function getDateInfo() {
        todayDate = new Date();
        dateInfo.todayDate = todayDate;
        dateInfo.dayOfWeek = todayDate.getDay();
        dateInfo.day = todayDate.getDate();
        dateInfo.month = todayDate.getMonth() + 1;
        // dateInfo.month = 1;
        dateInfo.year = todayDate.getFullYear();

        console.log(dateInfo);
    }

    function renderGrid() {
        renderNameOfDay();
        renderBlanks();
        renderDate();
    }

    function renderNameOfDay() {
        console.log(DOM.$calendarContainer);
        // prettier-ignore
        const dayArray = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        for (let i = 0; i < 7; i++) {
            const newGridItem = makeGridNameOfDay(dayArray[i]);
            DOM.$calendarContainer.insertAdjacentHTML('beforeend', newGridItem);
        }
    }

    function makeGridNameOfDay(day) {
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
            const newGridItem = makeBlankGridDate();
            DOM.$calendarContainer.insertAdjacentHTML('beforeend', newGridItem);
        }
    }

    function makeBlankGridDate() {
        let template = '';
        template += `<div class='date' data-date='blank'></div>`;
        return template;
    }

    function getInitialDayOfWeek() {
        const initialDay = new Date(`${dateInfo.month} 01 ${dateInfo.year}`);
        const initialDayOfWeek = initialDay.getDay();
        return initialDayOfWeek;
    }

    function makeGridDate(num) {
        const data = num.toString().padStart(2, '0');
        let template = '';
        template += `<div class='date' data-date=${data}>${num}</div>`;
        return template;
    }

    function renderDate() {
        const totalDays = getDaysInCurrentMonth();
        for (let i = 1; i < totalDays + 1; i++) {
            const newGridItem = makeGridDate(i);
            DOM.$calendarContainer.insertAdjacentHTML('beforeend', newGridItem);
        }
    }

    function getDaysInCurrentMonth() {
        // prettier-ignore
        const daysInMonthNonLeapArray = ['0', '31', '28', '31', '30', '31', '30', '31', '31', '30', '31', '30', '31']
        const daysInCurrentMonth = parseInt(
            daysInMonthNonLeapArray[dateInfo.month]
        );
        return daysInCurrentMonth;
    }

    function retrieveDateInfo() {
        return dateInfo;
    }

    // want to 'reset' the data panel. Need to check for non-todo event.target somehow
    function clickDate(event) {
        const clickedDataDate = event.target.dataset.date;
        const clickedDate = event.target;
        /*
        DOM.$dataName.textContent = '';
        DOM.$dataDescription.textContent = '';
        DOM.$dataNotes.textContent = '';
        */
    }

    // incorporated it into filterTodoList
    function filterForCurrentMonth() {
        // dont need this if == used instead of ===
        // const currentMonth = dateInfo.month.toString().padStart(2, '0');
        console.log(dateInfo.month);
        // prettier-ignore
        currentMonthTodos = todoList.filter((todo) => todo.duedate.slice(5,7) == dateInfo.month)

        return currentMonthTodos;
    }

    function printTodoToCalendar() {
        currentMonthTodos.forEach((todo) => {
            const todoDate = todo.duedate.slice(8, 10);
            // prettier-ignore
            const currentTile = document.querySelector(`[data-date="${todoDate}"]`);
            const template = createTodoButton(todo);
            currentTile.insertAdjacentHTML('beforeend', template);
        });
        bindClickTodo();
    }

    function createTodoButton(todo) {
        let snippet = '';
        if (todo.name.length > 20) {
            snippet = todo.name.slice(0, 18) + '...';
        } else {
            snippet = todo.name;
        }
        let template = '';
        template += `<div class='calendar-todo' data-todo=${todo.todoIndex} data-project=${todo.projectIndex}>${snippet}</div>`;
        return template;
    }

    function clickTodo(event) {
        const projectIndex = event.target.dataset.project;
        const todoIndex = event.target.dataset.todo;
        const currentTodo = findTodo(projectIndex, todoIndex);
        console.log('current todo: ', currentTodo);
        DOM.$dataName.textContent = currentTodo.name;
        DOM.$dataDescription.textContent = currentTodo.desc;
        DOM.$dataNotes.textContent = currentTodo.notes;
    }

    function findTodo(projectIndex, todoIndex) {
        console.log(todoList);
        const filteredTodoList = todoList.filter(
            (todo) => todo.projectIndex == projectIndex
        );
        const currentTodo = filteredTodoList.find(
            (todo) => todo.todoIndex == todoIndex
        );
        return currentTodo;
    }

    init();

    return { filterTodoList, retrieveDateInfo };
})();
