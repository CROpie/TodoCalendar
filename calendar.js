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

        getTodoList();
        filterForCurrentMonth();
        printTodoToCalendar();
    }

    function bindClickDate() {
        DOM.$calendarContainer.addEventListener('click', clickDate);
    }

    function bindClickTodo() {
        DOM.$todoNodeList = document.querySelectorAll('.todo');
        DOM.$todoNodeList.forEach((button) => {
            button.addEventListener('click', clickTodo);
        });
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

    function clickDate(event) {
        const clickedDataDate = event.target.dataset.date;
        const clickedDate = event.target;
    }

    function getTodoList() {
        todoList = RandomData.makeTodoList('test');
        console.log(todoList);
    }

    function filterForCurrentMonth() {
        // dont need this if == used instead of ===
        // const currentMonth = dateInfo.month.toString().padStart(2, '0');

        // prettier-ignore
        currentMonthTodos = todoList.filter((todo) => todo.duedate.slice(5,7) == dateInfo.month)
        console.log(currentMonthTodos);
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
        template += `<div class='todo' data-todo=${todo.todoIndex} data-project=${todo.projectIndex}>${snippet}</div>`;
        return template;
    }

    function clickTodo(event) {
        const projectIndex = event.target.dataset.project;
        const todoIndex = event.target.dataset.todo;
        const currentTodo = findTodo(projectIndex, todoIndex);
        DOM.$dataName.textContent = currentTodo.name;
        DOM.$dataDescription.textContent = currentTodo.desc;
        DOM.$dataNotes.textContent = currentTodo.notes;
    }

    function findTodo(projectIndex, todoIndex) {
        const filteredTodoList = todoList.filter(
            (todo) => todo.projectIndex == projectIndex
        );
        const currentTodo = filteredTodoList.find(
            (todo) => todo.todoIndex == todoIndex
        );
        return currentTodo;
    }

    init();

    return { retrieveDateInfo };
})();
