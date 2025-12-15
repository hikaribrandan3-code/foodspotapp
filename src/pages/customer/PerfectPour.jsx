// Budoni: El Tostador Mini Game
// Full HTML game embedded via iframe

function PerfectPour() {
    return (
        <iframe
            src="/budoni-game.html"
            title="Budoni: El Tostador"
            style={{
                width: '100%',
                height: '100vh',
                border: 'none',
                display: 'block'
            }}
        />
    )
}

export default PerfectPour
