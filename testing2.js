// https://medium.com/codingthesmartway-com-blog/create-a-rest-api-with-json-server-36da8680136d
// trying to see if any way to use Faker.js - style importing into json-server
// which would allow for a dynamic generation of dates. Don't think it will work.

function generateDefaultData() {
    const usernamesList = [];
    const projectList = [];
    const todosList = [];
    usernamesList.push({ username: 'Default' });
    projectList.push({
        username: 'Default',
        projectName: 'Lab Duties',
        projectIndex: 0,
    });
    projectList.push({
        username: 'Default',
        projectName: 'Catalysis',
        projectIndex: 1,
    }),
        projectList.push({
            username: 'Default',
            projectName: 'Lets Go!',
            projectIndex: 2,
        });
    todosList.push({
        username: 'Default',
        projectIndex: 0,
        name: 'Waste Disposal',
        desc: 'By 10:00 at the latest',
        duedate: '2023-04-16',
        notes: 'Take down the TLC plates too',
        todoIndex: 0,
    });

    return {
        usernames: usernamesList,
        projects: projectList,
        todos: todosList,
    };
}

module.exports = generateDefaultData;
