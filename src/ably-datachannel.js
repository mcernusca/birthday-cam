var messageList = {}
var membersList = []
var connections = {}
var currentChat
var apiKey = 'h6vEZA.9BEKAw:XGAq6Hym9lcxyxha'
var clientId = 'client-' + Math.random().toString(36).substr(2, 16)
var realtime = new Ably.Realtime({ key: apiKey, clientId: clientId })
var AblyRealtime = realtime.channels.get('ChatChannel')
AblyRealtime.presence.subscribe('enter', function (member) {
    AblyRealtime.presence.get((err, members) => {
        membersList = members
        renderMembers()
    })
})
AblyRealtime.presence.subscribe('leave', member => {
    delete (connections[member.client_id])
    if (member.client_id === currentChat) {
        currentChat = undefined
        document.getElementById('chat').style.display = 'none'
    }
    AblyRealtime.presence.get((err, members) => {
        membersList = members
        renderMembers()
    })
})
AblyRealtime.presence.enter()
function renderMembers() {
    var list = document.getElementById('memberList')
    var online = document.getElementById('online')
    online.innerHTML = 'Users online (' + (membersList.length === 0 ? 0 : membersList.length - 1) + ')'
    var html = ''
    if (membersList.length === 1) {
        html += '<li> No member online </li>'
        list.innerHTML = html
        return
    }
    for (var index = 0; index < membersList.length; index++) {
        var element = membersList[index]
        if (element.clientId !== clientId) {
            html += '<li><small>' + element.clientId + ' <button class="btn btn-xs btn-success" onclick=prepareChat("' + element.clientId + '")>chat now</button></small></li>'
        }
    }
    list.innerHTML = html
}
