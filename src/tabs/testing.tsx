//import testset from 'data-env:~assets/merged_testset.json';

function TestingPage() {
    //console.log(testset);
    
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: 16
        }}>
        <h2>Shaderunner Testing Page</h2>

        LLM-Text:
        <table>
            <thead>
                <tr><th>Page</th><th>LLM1</th><th>LLM2</th><th>LLM3</th></tr>
            </thead>
            <tbody>
                <tr><td>a</td><td>a</td><td>a</td><td>a</td></tr>
                <tr><td>a</td><td>a</td><td>a</td><td>a</td></tr>
                <tr><td>a</td><td>a</td><td>a</td><td>a</td></tr>
                <tr><td>a</td><td>a</td><td>a</td><td>a</td></tr>
            </tbody>
        </table>
      </div>
    )
  }
   
  export default TestingPage;