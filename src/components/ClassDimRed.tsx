import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useGlobalStorage } from '~util/useGlobalStorage';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { consistentColor } from '~util/DOM';
import { useSessionStorage as _useSessionStorage } from '~util/misc';
import { useStorage } from '@plasmohq/storage/hook';


const DEV = process.env.NODE_ENV == "development";
const useSessionStorage = DEV && process.env.PLASMO_PUBLIC_STORAGE == "persistent" ? useStorage : _useSessionStorage;


const ClassDimRed = ({ tabId }) => {
  const [ classifierData ] = useSessionStorage("classifierData:"+tabId, {});
  const [ [classEmbeddings] ] = useGlobalStorage(tabId, "classEmbeddings");
  const svgRef = useRef();
  const [ settings, setSettings ]= useState(null);
  const maxTicks = 300;

  console.log(classEmbeddings)

  useEffect(() => {
    if (!classEmbeddings) return;

    async function init() {
        const allclasses = classEmbeddings.allclasses;
        const embeddings = allclasses.map(c => classEmbeddings.embeddings[c].embedding)
        const classStore = new MemoryVectorStore(classEmbeddings.embeddings);
        classStore.memoryVectors = Object.values(classEmbeddings.embeddings);
        const class2Id = Object.fromEntries(allclasses.map((c, i) => [c, i]));


        const similarities = [];
        for(let i=0; i<allclasses.length; i++) {
            const similarities_c = new Array(embeddings.length).fill(0);
            const closest = await classStore.similaritySearchVectorWithScore(embeddings[i], embeddings.length);
            closest.forEach(c => {
                const cname = c[0].pageContent;
                const cscore = c[1];
                //similarities_c[class2Id[cname]] = -Math.log(cscore)*3;
                similarities_c[class2Id[cname]] = cscore * 100;
            })
            similarities.push(similarities_c)
        }

        setSettings([similarities, allclasses]);
    }
    init();
  }, [classEmbeddings])


  useEffect(() => {
    if (!settings) return;

    console.log(settings);
    const labels = settings[1];
    const similarities = settings[0];
    const nodes = labels.map(label => ({ id: label }));
    const links = similarityScoresToLinks(similarities, nodes);
    const pos_classes = classifierData.classes_pos;

    let linkedByIndex = {};
    links.forEach(d => {
        linkedByIndex[`${d.source.id},${d.target.id}`] = true;
    });

    function isConnected(a, b) {
        return linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id;
    }

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id)
            .distance(d => d.strength ))
        //.force("charge", d3.forceManyBody().strength(-0))
        .force("center", d3.forceCenter(100, 100));

    const svg = d3.select(svgRef.current);
    const link = svg.selectAll(".link")
      .data(links)
      .join("line")
      .classed("link", true)

    const node = svg.selectAll(".node")
      .data(nodes)
      .join("circle")
      .classed("node", true)
      .attr("r", 5)
      .attr("fill", d => consistentColor(d["id"], pos_classes.includes(d["id"]) ? 1.0 : 0.2))
      .on("mouseover", function(event, d) {
        // Display ID of the hovered node
        svg.append("text")
          .attr("x", d.x + 8)
          .attr("y", d.y + 3)
          .text(d.id)
          .attr("class", "node-label")
          .attr("fill", consistentColor(d["id"], pos_classes.includes(d["id"]) ? 1.0 : 0.2));
    
        // Display connected node IDs and similarities
        links.forEach(link => {
          if (link.source.id === d.id || link.target.id === d.id) {
            const targetNode = link.source.id === d.id ? link.target : link.source;
            svg.append("text")
              .attr("x", targetNode.x + 8)
              .attr("y", targetNode.y + 3)
              //.text(`${targetNode.id} (${link.strength.toFixed(2)})`)
              .text(`${link.strength.toFixed(2)}`)
              .attr("class", "node-label")
              .attr("fill", consistentColor(targetNode["id"], pos_classes.includes(targetNode["id"]) ? 1.0 : 0.2));
          }
        });
      })
      .on("mouseout", function() {
        svg.selectAll(".node-label").remove();
      });


    // Manually run the simulation for a fixed number of steps
    for (let i = 0; i < maxTicks; i++) {
        console.log("sim")
        simulation.tick();
        }
    
        // Update positions after simulation has run for fixed steps
        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);
    
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
    
        // Stop the simulation
        simulation.stop();
  }, [settings]);

  return (
    <>
      <svg ref={svgRef} width={600} height={600} />
      <div id="tooltip" style={{ position: 'absolute', opacity: 0, backgroundColor: "white", border: "1px solid black", padding: "5px" }}>
        {/* Tooltip content will go here */}
      </div>
    </>
  );
};


const similarityScoresToLinks = (similarityScores, labels) => {
    let links = [];
  
    // Iterate over the similarityScores to create links
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        if (similarityScores[i][j] > 0) {
          links.push({
            source: labels[i],
            target: labels[j],
            strength: similarityScores[i][j]
          });
        }
      }
    }
  
    return links;
  };

export default ClassDimRed;