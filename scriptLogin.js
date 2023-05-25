const LogInScreen = (() => {
    let usersList = [];

    const DOM = {
        $usernameInput: document.querySelector('.modal-input-field'),
    };

    function init() {
        DOM.$usernameInput.focus();
        bindings();
        retrieveUsernameList();
    }

    function bindings() {
        DOM.$usernameInput.addEventListener('keypress', enterUsername);
    }

    function enterUsername(event) {
        if (event.key === 'Enter') {
            if (!DOM.$usernameInput.value) {
                return;
            } else {
                let userName = DOM.$usernameInput.value;
                userName = userName.toLowerCase();
                checkIfDefault(userName);
            }
        }
    }

    function checkIfDefault(userName) {
        if (userName === 'default') {
            setUpDefaultData(userName);
        } else {
            checkIfNewUser(userName);
        }
    }

    /*
    just having the sequence of awaits didn't work, even when in a for...of loop ( = await in series ?)
    maybe a problem with json-server. From the log, could see that the deletes would be out of order, then
    it would just give up and stop deleting things.
    returning a value from the functions seems to help for some reason
    */
    async function setUpDefaultData(userName) {
        const projectData = await retrieveProjectList(userName);
        if (projectData) {
            await deleteProjectData(projectData);
        }

        const todoData = await retrieveTodoList(userName);
        if (todoData) {
            await deleteTodoData(todoData);
        }

        await addProjectListToDB(userName);
        await addTodoListToDB(userName);

        setLocalStorage(userName);
        window.location.href = 'index.html';
    }

    function checkIfNewUser(userName) {
        if (!usersList.includes(userName)) {
            addUsernameToDB(userName);
        }

        setLocalStorage(userName);
        window.location.href = 'index.html';
    }

    function setLocalStorage(userName) {
        //prettier-ignore
        window.localStorage.setItem("filterSettings", '{"projectIndex":-1,"dateIndex":"all"}')
        window.localStorage.setItem('userName', userName);
        window.localStorage.setItem('editFlag', false);
        window.localStorage.setItem('view', 'list');
    }

    async function retrieveUsernameList() {
        let uri = 'http://localhost:3000/usernames';
        const res = await fetch(uri);
        const usersData = await res.json();
        usersData.forEach((entry) => {
            usersList.push(entry.username);
        });
    }

    async function addUsernameToDB(newUsername) {
        const usernameEntry = { username: newUsername };
        let uri = 'http://localhost:3000/usernames';
        await fetch(uri, {
            method: 'POST',
            body: JSON.stringify(usernameEntry),
            headers: { 'Content-Type': 'application/json' },
        });
    }

    async function retrieveProjectList(userName) {
        let uri = `http://localhost:3000/projects?username=${userName}`;
        const res = await fetch(uri);
        const projectData = await res.json();
        if (projectData.length > 0) {
            return projectData;
        } else {
            return false;
        }
    }

    async function deleteProjectData(projectData) {
        for (project of projectData) {
            let uri = `http://localhost:3000/projects/${project.id}`;
            const res = await fetch(uri, { method: 'DELETE' });
        }
    }

    async function retrieveTodoList(userName) {
        let uri = `http://localhost:3000/todos?username=${userName}`;
        const res = await fetch(uri);
        const todoData = await res.json();
        if (todoData.length > 0) {
            return todoData;
        } else {
            return false;
        }
    }

    async function deleteTodoData(todoData) {
        for (todo of todoData) {
            let uri = `http://localhost:3000/todos/${todo.id}`;
            const res = await fetch(uri, { method: 'DELETE' });
        }
    }

    async function addProjectListToDB(userName) {
        const projectList = RandomData.makeProjectList(userName);
        for (project of projectList) {
            let uri = 'http://localhost:3000/projects';
            await fetch(uri, {
                method: 'POST',
                body: JSON.stringify(project),
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }

    async function addTodoListToDB(userName) {
        const todoList = RandomData.makeTodoList(userName);
        for (todo of todoList) {
            let uri = 'http://localhost:3000/todos';
            await fetch(uri, {
                method: 'POST',
                body: JSON.stringify(todo),
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return true;
    }

    init();
})();

const RandomData = (() => {
    let defaultDates = [];

    function init() {
        createDefaultDates();
    }

    function makeProjectList(userName) {
        const projectList = [
            {
                username: userName,
                projectName: 'Lab Duties',
                projectIndex: 0,
            },
            {
                username: userName,
                projectName: 'Catalysis',
                projectIndex: 1,
            },
        ];
        return projectList;
    }

    function makeTodoList(userName) {
        const todoList = [
            {
                username: userName,
                projectIndex: 1,
                name: 'Mitsunobu reaction',
                desc: 'Book 7 page 12',
                duedate: defaultDates[0],
                notes: "Didn't run under nitrogen last time and it was still fine. Repeat reaction to make more starting material",
                todoIndex: 0,
            },
            {
                username: userName,
                projectIndex: 0,
                name: 'Waste Disposal',
                desc: 'By 10:00 at the latest',
                duedate: defaultDates[1],
                notes: 'Take down the TLC plates too',
                todoIndex: 0,
            },
            {
                username: userName,
                projectIndex: 1,
                name: 'Wash glassware',
                desc: 'Do the syringe needles top',
                duedate: defaultDates[2],
                notes: "Make sure to put in the oven in preparation for tomorrow's reaction",
                todoIndex: 1,
            },
            {
                username: userName,
                projectIndex: 0,
                name: 'Waste Solvent Disposal',
                desc: '10:00 at the lobby',
                duedate: defaultDates[3],
                notes: 'Make sure to bring back some empty carboys (if available)',
                todoIndex: 1,
            },
            {
                username: userName,
                projectIndex: 1,
                name: 'BCl3/AlCl3 reaction',
                desc: 'Book 7 page 10',
                duedate: defaultDates[4],
                notes: 'Enough material for a 1g scale reaction',
                todoIndex: 2,
            },
            {
                username: userName,
                projectIndex: 0,
                name: 'Liquid Nitrogen',
                desc: 'Take it from floor 3 when it arrives',
                duedate: defaultDates[5],
                notes: 'Asada has been doing freeze-pump-thaw cycles recently, so need to fill it to the brim',
                todoIndex: 2,
            },
            {
                username: userName,
                projectIndex: 1,
                name: 'Sonogashira coupling',
                desc: 'Book 7 page 11',
                duedate: defaultDates[6],
                notes: 'Use the fresh alkyne when it arrives',
                todoIndex: 3,
            },
            {
                username: userName,
                projectIndex: 0,
                name: 'Dry Ice',
                desc: 'Move it to the storage container',
                duedate: defaultDates[7],
                notes: 'Be sure to dispose of the plastic inside the container before filling it',
                todoIndex: 3,
            },
            {
                username: userName,
                projectIndex: 1,
                name: 'Chemical delivery',
                desc: 'Materials for the next set of reactions',
                duedate: defaultDates[8],
                notes: 'May need to order more AlCl3 soon',
                todoIndex: 4,
            },
            {
                username: userName,
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
        return defaultDates;
    }

    init();

    return { makeProjectList, makeTodoList };
})();

/*
Wanted to use this to add random data to the DB, but won't work
because need to specify the id of the projects / the todos.
This will cause existing data to be overwritten.

    async function putProjectListToDB(userName) {
        const projectList = RandomData.makeProjectList(userName);
        let counter = 1;
        for (project of projectList) {
            let uri = `http://localhost:3000/projects/${counter}`;
            await fetch(uri, {
                method: 'PUT',
                body: JSON.stringify(project),
                headers: { 'Content-Type': 'application/json' },
            });
            counter += 1;
        }
    }
*/

/*
    // want a date in the past, but if it is the 1st of the month, todayPlusInterval(-1) will not work properly
    // in this case, just remove a year from the current day.
    const checkToday = todayPlusInterval(0);
    if (checkToday.slice(8) === '01') {
        let splitDate = checkToday.split('-');
        const newDate = `${splitDate[0] - 1}-${splitDate[1]}-${
            splitDate[2]
        }`;
        data[0].data[0].duedate = newDate;
    } else {
        data[0].data[0].duedate = todayPlusInterval(-1);
    }
 
*/
