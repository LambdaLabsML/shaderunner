import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useGlobalStorage } from '~util/useGlobalStorage';
import { consistentColor } from '~util/DOM';
import { useStorage as _useStorage } from '~util/misc';
import { useStorage } from '@plasmohq/storage/hook';
import { VectorStore_fromClass2Embedding } from '~util/embedding';



const ClassDimRed = ({ tabId }) => {
  const [ classifierData ] = useStorage("classifierData:"+tabId, {});
  const [ [classEmbeddings] ] = useGlobalStorage(tabId, "classEmbeddings");
  const svgRef = useRef();
  const [ settings, setSettings ]= useState(null);
  const maxTicks = 300;


  useEffect(() => {
    if (!classEmbeddings) return;

    async function init() {
        const allclasses = [...classifierData.classes_pos, ...classifierData.classes_neg];
        const classStore = VectorStore_fromClass2Embedding(classEmbeddings)
        const class2Id = Object.fromEntries(allclasses.map((c, i) => [c, i]));

        const similarities = [];
        let [min, max] = [Infinity, 0];
        for(let i=0; i<allclasses.length; i++) {
            const similarities_c = new Array(allclasses.length).fill(0);
            const closest = await classStore.similaritySearchVectorWithScore(classStore.embeddings[i], allclasses.length);
            closest.forEach(c => {
                const cname = c[0].pageContent;
                const cscore = c[1];
                //similarities_c[class2Id[cname]] = -Math.log(cscore)*3;
                similarities_c[class2Id[cname]] = cscore;
                if (cscore < min)
                    min = cscore;
                if (cscore > max)
                    max = cscore;
            })
            similarities.push(similarities_c)
        }

        setSettings([similarities, allclasses, min, max]);
    }
    init();
  }, [classEmbeddings, classifierData])


  useEffect(() => {
    if (!settings) return;

    const names = settings[1];
    const similarities = settings[0];
    const min = settings[2];
    const max = settings[3];
    const nodes = names.map(label => ({ id: label }));
    const links = similarityScoresToLinks(similarities, nodes);
    const pos_classes = classifierData.classes_pos;

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id)
            //.distance(d => -Math.log(1-d.strength)*50))
            .distance(d => (d.strength-min)/(max-min) * 250 ))
        //.force("charge", d3.forceManyBody().strength(-0))
        .force("center", d3.forceCenter(100, 100));

    const svg = d3.select(svgRef.current);
    const link = svg.selectAll(".link")
      .data(links)
      .join("line")
      .classed("link", true)

    const labels = svg.selectAll(".node-label")
      .data(nodes)
      .join("text")
      .classed("node-label", true)
      .attr("x", d => d.x + 8)
      .attr("y", d => d.y + 3)
      .text(d => d.id)
      .attr("fill", d => consistentColor(d["id"], pos_classes.includes(d["id"]) ? 1.0 : 0.2));
    

      // Node definition
      const node = svg.selectAll(".node")
          .data(nodes)
          .join("circle")
          .classed("node", true)
          .attr("r", 5)
          .attr("fill", d => consistentColor(d["id"], pos_classes.includes(d["id"]) ? 1.0 : 0.2))
          .on("mouseover", function (event, d) {
              // Add labels for similarity scores
              links.forEach(link => {
                  if (link.source.id === d.id || link.target.id === d.id) {
                      const targetNode = link.source.id === d.id ? link.target : link.source;
                      svg.append("text")
                          .attr("x", targetNode.x + 8)
                          .attr("y", targetNode.y + 3)
                          .text(`${link.strength.toFixed(2)}`)
                          .attr("class", "similarity-label")
                          .attr("fill", consistentColor(targetNode["id"], pos_classes.includes(targetNode["id"]) ? 1.0 : 0.2));
                  }
              });

              labels.style("opacity", label => label.id === d.id ? 1 : 0);
          })
          .on("mouseout", function () {
              svg.selectAll(".similarity-label").remove();
              labels.style("opacity", 1);
          });


    


      // Manually run the simulation for a fixed number of steps
      for (let i = 0; i < maxTicks; i++) {
          simulation.tick();

          // Update positions of nodes, links, and labels
          node.attr("cx", d => d.x)
              .attr("cy", d => d.y);

          link.attr("x1", d => d.source.x)
              .attr("y1", d => d.source.y)
              .attr("x2", d => d.target.x)
              .attr("y2", d => d.target.y);

          labels.attr("x", d => d.x + 8)
              .attr("y", d => d.y + 3);
      }
    
      // Stop the simulation
      simulation.stop();
  }, [settings]);

  return <svg ref={svgRef} width={"100%"} height={300} />;
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