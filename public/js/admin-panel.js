document.addEventListener("DOMContentLoaded", function () {
    loadItems();
});

function loadItems() {
    fetch("/main/api/getSettings")
        .then((response) => response.json())
        .then((data) => {
            displayItems(data);
        });
}

function displayItems(items) {
    const itemList = document.getElementById("itemList");
    itemList.innerHTML = "";
    items.forEach((item) => {
        addItem(item);
    });
}

function addItem(item) {
    const itemList = document.getElementById("itemList");
    itemList.innerHTML += `<tr id="${item.username}">
                            <td onclick="writeMessage('user','${
                                item.user_id
                            }')">
                                <input
                                    type="text"
                                    id="textInput"
                                    value="${item.username}${
        item.user_id ? "" : " (не активований)"
    }"
                                    disabled
                                />
                            </td>
                            <td>
                                <input
                                    class="button-17"
                                    type="button"
                                    onclick="deleteUser('${item.username}')"
                                    value="Видалити"
                                />
                            </td>
                        </tr>`;
}

function deleteItem(item) {
    var elem = document.getElementById(item);
    return elem.parentNode.removeChild(elem);
}

function addUser() {
    const textInput = document.getElementById("textInput");
    const newItem = textInput.value.trim();
    if (newItem !== "") {
        fetch("/main/api/addUser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json;charset=utf-8",
            },
            body: JSON.stringify({ username: newItem }),
        }).then();
        textInput.value = "";
        addItem({ username: newItem, user_id: "" });
    }
}

function deleteUser(username) {
    console.log(username);
    fetch("/main/api/deleteUser", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json;charset=utf-8",
        },
        body: JSON.stringify({ username }),
    }).then();
    deleteItem(username);
}

document.getElementById("sendMessage").addEventListener("click", () => {
    const id = document.getElementById("chat_id").value;
    const messageText = document.getElementById("messageText").value;
    switch (document.getElementById("messageReciever").value) {
        case "all":
            document.getElementById("chat_id").value = "";
            fetch("/main/api/messageAll", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json;charset=utf-8",
                },
                body: JSON.stringify({ message: messageText }),
            }).then();
            alert("Сообщение успешно отправлено");
            break;
        case "user":
            fetch("/main/api/messageOneUser", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json;charset=utf-8",
                },
                body: JSON.stringify({ user_id: id, message: messageText }),
            }).then();
            alert("Сообщение успешно отправлено");
            break;
    }
});

function writeMessage(type, id) {
    document.getElementById("messageReciever").value = type;
    document.getElementById("chat_id").value = id;
}
